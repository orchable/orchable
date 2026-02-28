-- Migration: Add RPC to sync batch counters
-- Created: 2026-03-01
-- Description: This RPC recalculates the total, pending, processing, completed, and failed task counters for a batch
-- based on the actual rows in the ai_tasks table, and updates the task_batches row accordingly.
-- It resolves desyncs caused by race conditions or manual row deletions.

CREATE OR REPLACE FUNCTION public.sync_batch_counters(p_batch_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_tasks INTEGER;
    v_pending_tasks INTEGER;
    v_processing_tasks INTEGER;
    v_completed_tasks INTEGER;
    v_failed_tasks INTEGER;
    v_new_status VARCHAR;
    v_completed_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Recount all task statuses for the given batch
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status::text IN ('plan', 'pending', 'awaiting_approval')),
        COUNT(*) FILTER (WHERE status::text IN ('running', 'processing')),
        COUNT(*) FILTER (WHERE status::text IN ('approved', 'completed', 'generated', 'skipped')),
        COUNT(*) FILTER (WHERE status::text IN ('failed', 'cancelled'))
    INTO 
        v_total_tasks,
        v_pending_tasks,
        v_processing_tasks,
        v_completed_tasks,
        v_failed_tasks
    FROM public.ai_tasks
    WHERE batch_id = p_batch_id;

    -- 2. Determine new batch status
    IF v_total_tasks = 0 THEN
        v_new_status := 'pending';
    ELSIF (v_completed_tasks + v_failed_tasks) >= v_total_tasks THEN
        IF v_failed_tasks > 0 THEN
            v_new_status := 'failed';
        ELSE
            v_new_status := 'completed';
        END IF;
        v_completed_at := now();
    ELSE
        -- If it's not done, and we have processing tasks, it's processing.
        -- Even if we don't, if some are done and some pending, it's processing.
        -- If all are pending, it's pending.
        IF v_processing_tasks > 0 OR v_completed_tasks > 0 OR v_failed_tasks > 0 THEN
            v_new_status := 'processing';
        ELSE
            v_new_status := 'pending';
        END IF;
        v_completed_at := NULL;
    END IF;

    -- 3. Update the task_batches table
    UPDATE public.task_batches
    SET 
        total_tasks = v_total_tasks,
        pending_tasks = v_pending_tasks,
        processing_tasks = v_processing_tasks,
        completed_tasks = v_completed_tasks,
        failed_tasks = v_failed_tasks,
        status = v_new_status,
        completed_at = COALESCE(task_batches.completed_at, v_completed_at),
        updated_at = now()
    WHERE id = p_batch_id;
END;
$$;
