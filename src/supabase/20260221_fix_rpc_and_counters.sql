-- Migration: Fix RPC and Batch Counters
-- Created: 2026-02-21

-- 1. Correct the RPC function
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
  v_new_status VARCHAR(20);
BEGIN
  -- 1. Get task config
  SELECT requires_approval INTO v_requires_approval
  FROM public.ai_tasks
  WHERE id = p_task_id;

  v_new_status := CASE WHEN v_requires_approval THEN 'awaiting_approval' ELSE 'completed' END;

  -- 2. Update the task status and result
  -- This will fire trigger_update_batch_counters
  UPDATE public.ai_tasks 
  SET status = v_new_status, 
      output_data = p_output_result,
      completed_at = now() 
  WHERE id = p_task_id;

  -- 3. Read trigger-maintained counters from task_batches
  -- We use both completed and failed to determine if it's the absolute last task
  SELECT total_tasks, completed_tasks, failed_tasks 
  INTO v_total, v_completed, v_failed
  FROM public.task_batches
  WHERE id = p_batch_id;

  -- 4. Return the result
  -- is_last_task is true if all tasks are either completed or failed
  RETURN QUERY SELECT 
    (v_completed + v_failed >= v_total) as is_last_task,
    (v_completed + v_failed) as finished_count,
    v_total as total_count;
END;
$$;

-- 2. Cleanup: We no longer need the redundant finished_tasks column
-- (Optional, but good for data integrity as it was misleading)
-- ALTER TABLE public.task_batches DROP COLUMN IF EXISTS finished_tasks;
