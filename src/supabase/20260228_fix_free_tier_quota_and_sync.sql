-- Migration: Fix Free Tier Quota and Sync Issues
-- Description: 
-- 1. Ensure user_usage has a unique constraint for upserts.
-- 2. Update v_runnable_tasks view to filter out BYOK tasks and check quota.
-- 3. Update increment_finished_task RPC to track usage increments.
-- 4. Update submit_free_tier_tasks RPC to track usage increments.

-- 1. Add unique constraint to user_usage if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_usage_user_month_unique'
    ) THEN
        ALTER TABLE public.user_usage
        ADD CONSTRAINT user_usage_user_month_unique UNIQUE (user_id, month);
    END IF;
END $$;

-- 2. Update v_runnable_tasks view
DROP VIEW IF EXISTS public.v_runnable_tasks CASCADE;
CREATE OR REPLACE VIEW public.v_runnable_tasks WITH (security_invoker = true) AS
SELECT
  t.id,
  COALESCE(t.task_type, (pt.stage_config ->> 'type'::text)::character varying) as task_type,
  t.status,
  t.input_data,
  pt.default_ai_settings ->> 'model_id'::text as model_id,
  ((pt.default_ai_settings -> 'generationConfig'::text) ->> 'temperature'::text)::numeric as temperature,
  pt.default_ai_settings as ai_settings,
  t.agent_id,
  t.batch_priority,
  t.test_mode,
  t.batch_id,
  t.launch_id,
  t.lo_code,
  t.sequence,
  t.phase_code,
  t.retry_count,
  t.step_id,
  t.parent_task_id,
  t.root_task_id,
  t.hierarchy_path,
  t.stage_key,
  t.step_number,
  t.total_steps,
  t.next_task_config,
  t.orchestrator_execution_id,
  t.step_execution_id,
  t.requires_approval,
  t.prompt_template_id,
  pt.next_stage_template_ids,
  pt.next_stage_template_ids[1] as next_stage_template_id,
  t.created_at,
  t.extra,
  t.split_group_id,
  t.user_id,
  t.tier_source, -- Propagate tier_source to n8n
  b.status as batch_status,
  b.name as batch_name
FROM ai_tasks t
LEFT JOIN prompt_templates pt ON t.prompt_template_id = pt.id
LEFT JOIN ai_tasks parent ON t.parent_task_id = parent.id
LEFT JOIN task_batches b ON t.batch_id = b.id
WHERE t.status::text = 'plan'::text
  AND (
    t.parent_task_id is null
    OR (
      parent.status::text = any (array['completed'::text, 'generated'::text, 'approved'::text])
    )
  )
  -- NEW: Exclude BYOK tasks (processed locally by browser worker)
  AND (t.tier_source IS NULL OR t.tier_source != 'free_byok')
  -- NEW: Quota gate for free_pool tasks
  AND (
    t.tier_source IS NULL 
    OR t.tier_source != 'free_pool'
    OR NOT EXISTS (
      SELECT 1 FROM public.user_usage uu
      WHERE uu.user_id = t.user_id
        AND uu.month = to_char(now(), 'YYYY-MM')
        AND uu.task_count >= 30
    )
  )
ORDER BY t.test_mode desc, t.batch_priority, t.step_number, t.sequence;

-- 3. Update increment_finished_task RPC
CREATE OR REPLACE FUNCTION public.increment_finished_task(
  p_batch_id UUID,
  p_task_id UUID,
  p_output_result JSONB DEFAULT NULL
)
RETURNS TABLE (
  is_last_task BOOLEAN,
  finished_count INTEGER,
  total_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
  v_completed INTEGER;
  v_failed INTEGER;
  v_requires_approval BOOLEAN;
  v_new_status public.ai_task_status;
  v_user_id UUID;
  v_tier_source VARCHAR;
BEGIN
  -- 1. Get task config, user_id, and tier_source
  SELECT requires_approval, user_id, tier_source 
  INTO v_requires_approval, v_user_id, v_tier_source
  FROM public.ai_tasks
  WHERE id = p_task_id;

  v_new_status := CASE WHEN v_requires_approval THEN 'awaiting_approval'::public.ai_task_status ELSE 'completed'::public.ai_task_status END;

  -- 2. Update the task status and result
  UPDATE public.ai_tasks 
  SET status = v_new_status, 
      output_data = p_output_result,
      completed_at = now() 
  WHERE id = p_task_id;

  -- 3. Increment usage for free_pool tasks
  IF v_tier_source = 'free_pool' AND v_user_id IS NOT NULL THEN
    INSERT INTO public.user_usage (user_id, month, task_count)
    VALUES (v_user_id, to_char(now(), 'YYYY-MM'), 1)
    ON CONFLICT (user_id, month)
    DO UPDATE SET task_count = user_usage.task_count + 1,
                 updated_at = now();
  END IF;

  -- 4. Read trigger-maintained counters from task_batches
  SELECT total_tasks, completed_tasks, failed_tasks 
  INTO v_total, v_completed, v_failed
  FROM public.task_batches
  WHERE id = p_batch_id;

  -- 5. Return the result
  RETURN QUERY SELECT 
    (v_completed + v_failed >= v_total) as is_last_task,
    (v_completed + v_failed) as finished_count,
    v_total as total_count;
END;
$$;

-- 4. Update submit_free_tier_tasks RPC
CREATE OR REPLACE FUNCTION public.submit_free_tier_tasks(
  p_batch_id UUID,
  p_tasks JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_new_count INTEGER;
    v_used INTEGER;
    v_limit INTEGER := 30;
    v_month VARCHAR := to_char(now(), 'YYYY-MM');
    v_task JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_new_count := jsonb_array_length(p_tasks);

    -- 1. Check current usage
    SELECT COALESCE(task_count, 0) INTO v_used
    FROM public.user_usage
    WHERE user_id = v_user_id AND month = v_month;

    -- 2. Enforce limit
    IF COALESCE(v_used, 0) + v_new_count > v_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Monthly quota exceeded. Limit: ' || v_limit || ', Used: ' || COALESCE(v_used, 0),
            'quota_left', GREATEST(0, v_limit - COALESCE(v_used, 0))
        );
    END IF;

    -- 3. Insert tasks
    FOR v_task IN SELECT * FROM jsonb_array_elements(p_tasks)
    LOOP
        INSERT INTO public.ai_tasks (
            batch_id,
            user_id,
            prompt_template_id,
            task_type,
            prompt,
            input_data,
            extra,
            tier_source,
            status,
            sequence,
            step_number,
            stage_key
        ) VALUES (
            p_batch_id,
            v_user_id,
            v_task->>'prompt_template_id',
            v_task->>'task_type',
            v_task->>'prompt',
            (v_task->>'input_data')::jsonb,
            (v_task->>'extra')::jsonb,
            'free_pool',
            'plan',
            (v_task->>'sequence')::integer,
            (v_task->>'step_number')::integer,
            v_task->>'stage_key'
        );
    END LOOP;

    -- 4. NEW: Increment user_usage
    INSERT INTO public.user_usage (user_id, month, task_count)
    VALUES (v_user_id, v_month, v_new_count)
    ON CONFLICT (user_id, month)
    DO UPDATE SET task_count = user_usage.task_count + v_new_count,
                 updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'count', v_new_count,
        'quota_left', v_limit - (COALESCE(v_used, 0) + v_new_count)
    );
END;
$$;
