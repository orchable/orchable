-- Migration: Add cascade retry to retry_failed_task
-- When retrying a task, also reset all downstream children (tasks whose
-- parent_task_id chain leads back to the retried task) so they re-run
-- with the new output.
-- Created: 2026-02-27

-- 1. Replace retry_failed_task with cascade version
CREATE OR REPLACE FUNCTION retry_failed_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id uuid;
    v_status varchar;
    v_cascade_count integer;
BEGIN
    SELECT batch_id, status INTO v_batch_id, v_status
    FROM public.ai_tasks
    WHERE id = p_task_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    IF v_status != 'failed' THEN
        RAISE EXCEPTION 'Only failed tasks can be retried';
    END IF;

    -- 1. Reset the target task
    UPDATE public.ai_tasks
    SET status = 'pending',
        error_message = NULL,
        output_data = NULL,
        started_at = NULL,
        completed_at = NULL,
        retry_count = COALESCE(retry_count, 0) + 1
    WHERE id = p_task_id;

    -- 2. Cascade: reset all downstream children recursively
    -- Find all tasks whose parent_task_id chain leads back to p_task_id
    WITH RECURSIVE descendants AS (
        -- Direct children of the retried task
        SELECT id FROM public.ai_tasks
        WHERE parent_task_id = p_task_id
          AND status IN ('completed', 'failed')
        UNION ALL
        -- Grandchildren, etc.
        SELECT t.id FROM public.ai_tasks t
        INNER JOIN descendants d ON t.parent_task_id = d.id
        WHERE t.status IN ('completed', 'failed')
    )
    UPDATE public.ai_tasks
    SET status = 'pending',
        error_message = NULL,
        output_data = NULL,
        started_at = NULL,
        completed_at = NULL
    WHERE id IN (SELECT id FROM descendants);

    -- Count how many descendants were reset
    GET DIAGNOSTICS v_cascade_count = ROW_COUNT;

    -- 3. Update batch counters
    -- We reset 1 (the task itself) + v_cascade_count descendants
    IF v_batch_id IS NOT NULL THEN
        UPDATE public.task_batches
        SET failed_tasks = GREATEST(0, failed_tasks - 1),
            completed_tasks = GREATEST(0, completed_tasks - v_cascade_count),
            pending_tasks = pending_tasks + 1 + v_cascade_count,
            status = CASE 
                WHEN status IN ('completed', 'failed') THEN 'processing'
                ELSE status 
            END
        WHERE id = v_batch_id;
    END IF;
END;
$$;
