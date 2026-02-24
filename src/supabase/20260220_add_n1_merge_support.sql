-- Migration: Add N:1 Merge Support
-- Created: 2026-02-20

-- 1. Add finished_tasks counter to task_batches
ALTER TABLE public.task_batches ADD COLUMN IF NOT EXISTS finished_tasks INTEGER DEFAULT 0;

-- 2. Create RPC function for atomic increment and completion check
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
  v_finished INTEGER;
BEGIN
  -- 1. Update the task status and result
  UPDATE public.ai_tasks 
  SET status = 'completed', 
      output_data = p_output_result,
      completed_at = now() 
  WHERE id = p_task_id;

  -- 2. Atomic increment of finished_tasks in the batch
  UPDATE public.task_batches
  SET finished_tasks = finished_tasks + 1
  WHERE id = p_batch_id
  RETURNING total_tasks, finished_tasks INTO v_total, v_finished;

  -- 3. Return the result
  RETURN QUERY SELECT 
    (v_finished >= v_total) as is_last_task,
    v_finished as finished_count,
    v_total as total_count;
END;
$$;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_finished_task(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_finished_task(UUID, UUID, JSONB) TO service_role;
