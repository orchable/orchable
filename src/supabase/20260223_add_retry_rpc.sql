-- Migration: Add RPC functions for retrying failed tasks
-- Created: 2026-02-23

-- 1. Retry a single failed task
CREATE OR REPLACE FUNCTION retry_failed_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id uuid;
    v_status varchar;
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

    -- Update task status
    UPDATE public.ai_tasks
    SET status = 'pending',
        error_message = NULL,
        retry_count = COALESCE(retry_count, 0) + 1
    WHERE id = p_task_id;

    -- Update batch counters: reduce failed_tasks, increase pending_tasks
    IF v_batch_id IS NOT NULL THEN
        UPDATE public.task_batches
        SET failed_tasks = GREATEST(0, failed_tasks - 1),
            pending_tasks = pending_tasks + 1,
            -- If it was completed/failed and now has pending tasks, set to processing
            status = CASE 
                WHEN status IN ('completed', 'failed') THEN 'processing'
                ELSE status 
            END
        WHERE id = v_batch_id;
    END IF;
END;
$$;

-- 2. Retry all failed tasks in a batch
CREATE OR REPLACE FUNCTION retry_all_failed_in_batch(p_batch_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_retry_count integer;
BEGIN
    -- Count how many tasks we're going to update
    SELECT COUNT(*) INTO v_retry_count
    FROM public.ai_tasks
    WHERE batch_id = p_batch_id AND status = 'failed';

    IF v_retry_count = 0 THEN
        RETURN 0;
    END IF;

    -- Update all failed tasks to pending
    UPDATE public.ai_tasks
    SET status = 'pending',
        error_message = NULL,
        retry_count = COALESCE(retry_count, 0) + 1
    WHERE batch_id = p_batch_id AND status = 'failed';

    -- Update batch counters
    UPDATE public.task_batches
    SET failed_tasks = GREATEST(0, failed_tasks - v_retry_count),
        pending_tasks = pending_tasks + v_retry_count,
        status = CASE 
            WHEN status IN ('completed', 'failed') THEN 'processing'
            ELSE status 
        END
    WHERE id = p_batch_id;

    RETURN v_retry_count;
END;
$$;
