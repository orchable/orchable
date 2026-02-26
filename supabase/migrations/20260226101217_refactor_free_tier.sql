-- Migration: Refactor Free Tier Server-Side Enforcement
-- Date: 2026-02-26

-- 1.1 & 1.2: Add columns to ai_tasks
ALTER TABLE public.ai_tasks 
ADD COLUMN IF NOT EXISTS tier_source VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS synced_to_client BOOLEAN DEFAULT FALSE;

-- 1.3: Ensure user_usage table exists
CREATE TABLE IF NOT EXISTS public.user_usage (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- YYYY-MM
    task_count INTEGER DEFAULT 0,
    token_input_count BIGINT DEFAULT 0,
    token_output_count BIGINT DEFAULT 0,
    PRIMARY KEY (user_id, month)
);

-- 1.4: Create submit_free_tier_tasks RPC
CREATE OR REPLACE FUNCTION public.submit_free_tier_tasks(
    p_tasks JSONB
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_used INT;
    v_new_count INT;
    v_limit INT := 30;
    v_month VARCHAR(7) := to_char(now(), 'YYYY-MM');
BEGIN
    -- 1. Security Check: Must be authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Read from PERMANENT usage counter
    SELECT COALESCE(task_count, 0) INTO v_used
    FROM public.user_usage
    WHERE user_id = v_user_id
      AND month = v_month;

    v_new_count := jsonb_array_length(p_tasks);

    -- 3. Check Quota
    IF COALESCE(v_used, 0) + v_new_count > v_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'QUOTA_EXCEEDED',
            'used', COALESCE(v_used, 0),
            'limit', v_limit,
            'remaining', GREATEST(0, v_limit - COALESCE(v_used, 0))
        );
    END IF;

    -- 4. Insert tasks
    INSERT INTO public.ai_tasks (
        task_type,
        status,
        input_data,
        user_id,
        created_by,
        batch_id,
        prompt_template_id,
        tier_source,
        extra
    )
    SELECT 
        (elem->>'task_type')::VARCHAR,
        COALESCE((elem->>'status'), 'plan')::public.ai_task_status,
        COALESCE((elem->'input_data'), '{}'::jsonb),
        v_user_id,
        v_user_id,
        (elem->>'batch_id')::UUID,
        (elem->>'prompt_template_id'),
        'free_pool',
        COALESCE((elem->'extra'), '{}'::jsonb)
    FROM jsonb_array_elements(p_tasks) AS elem;

    RETURN jsonb_build_object(
        'success', true,
        'used', COALESCE(v_used, 0),
        'remaining', v_limit - COALESCE(v_used, 0) - v_new_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.5: Create on_task_completed trigger
CREATE OR REPLACE FUNCTION public.on_task_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed'
       AND NEW.tier_source = 'free_pool' THEN
        -- Increment permanent counter
        INSERT INTO public.user_usage (user_id, month, task_count)
        VALUES (NEW.user_id, to_char(now(), 'YYYY-MM'), 1)
        ON CONFLICT (user_id, month)
        DO UPDATE SET task_count = public.user_usage.task_count + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_task_completed ON public.ai_tasks;
CREATE TRIGGER trg_task_completed
    AFTER UPDATE ON public.ai_tasks
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION public.on_task_completed();

-- 1.6: Updated get_free_tier_usage RPC
CREATE OR REPLACE FUNCTION public.get_free_tier_usage() 
RETURNS TABLE("month" VARCHAR, "used" INTEGER, "limit" INTEGER, "remaining" INTEGER)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_limit INTEGER := 30;
    v_month VARCHAR(7) := to_char(now(), 'YYYY-MM');
BEGIN
    RETURN QUERY
    SELECT 
        v_month,
        COALESCE(u.task_count, 0),
        v_limit,
        GREATEST(0, v_limit - COALESCE(u.task_count, 0))
    FROM (SELECT v_user_id as user_id) p
    LEFT JOIN public.user_usage u ON u.user_id = p.user_id AND u.month = v_month;
END;
$$;

-- 1.7: Setup cleanup logic
CREATE OR REPLACE FUNCTION public.cleanup_expired_free_tasks()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.ai_tasks
    WHERE tier_source = 'free_pool'
      AND status = 'completed'
      AND completed_at < now() - interval '1 day';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron if available (requires superuser on many providers, but standard for Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup every 6 hours
SELECT cron.schedule(
    'cleanup-free-tier-tasks',
    '0 */6 * * *',
    $$ SELECT public.cleanup_expired_free_tasks(); $$
);

-- 1.8: Notification trigger for STARTED tasks
CREATE OR REPLACE FUNCTION public.trigger_notification_on_start()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tier_source = 'free_pool' THEN
        -- Call Edge Function via HTTP (Hypothetical, usually done via Supabase Webhooks UI)
        -- For now, we just log it or insert into a notifications table
        INSERT INTO public.notifications (user_id, type, task_id)
        VALUES (NEW.user_id, 'STARTED', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT,
    task_id UUID,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_free_tier_start_notify ON public.ai_tasks;
CREATE TRIGGER trg_free_tier_start_notify
    AFTER INSERT ON public.ai_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_notification_on_start();

-- 1.9: Add index
CREATE INDEX IF NOT EXISTS idx_ai_tasks_free_tier_cleanup 
ON public.ai_tasks (tier_source, status, completed_at) 
WHERE tier_source = 'free_pool';
