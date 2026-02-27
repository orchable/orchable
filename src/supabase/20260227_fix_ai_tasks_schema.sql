-- Migration: Fix ai_tasks Schema Mismatches
-- Date: 2026-02-27

-- 1. Add missing updated_at column
ALTER TABLE public.ai_tasks 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Setup trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_tasks_updated_at ON public.ai_tasks;
CREATE TRIGGER trg_ai_tasks_updated_at
    BEFORE UPDATE ON public.ai_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. Fix submit_free_tier_tasks RPC (Replace created_by with user_id)
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

    -- 2. Read usage
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

    -- 4. Insert tasks (FIXED: use user_id instead of created_by)
    INSERT INTO public.ai_tasks (
        task_type,
        status,
        input_data,
        user_id,
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
