-- Migration: Fix task_batch counter trigger to handle multi-stage task creation
-- Created: 2026-02-16
-- Problem: When n8n creates step 2 tasks (e.g. formatted_question), the trigger
--          updates status counters but never increments total_tasks.
--          This causes completion detection to fire prematurely.

CREATE OR REPLACE FUNCTION update_task_batch_counters()
RETURNS TRIGGER AS $$
DECLARE
    old_status VARCHAR(20);
    new_status VARCHAR(20);
    v_batch_id UUID;
    is_new_task BOOLEAN;
BEGIN
    -- Get batch_id and statuses
    v_batch_id := COALESCE(NEW.batch_id, OLD.batch_id);
    IF v_batch_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Detect if this is a brand new task (INSERT) vs status update (UPDATE)
    is_new_task := (TG_OP = 'INSERT');
    
    old_status := COALESCE(OLD.status, 'none');
    new_status := NEW.status;
    
    -- For INSERT: increment total_tasks AND re-open batch if it was prematurely completed
    IF is_new_task THEN
        -- Increment total_tasks + revert batch status if it was prematurely completed
        -- This handles the race condition where step 1 tasks complete before step 2 tasks are created
        UPDATE task_batches 
        SET total_tasks = total_tasks + 1,
            -- Re-open batch if it was marked completed but new tasks are being added
            status = CASE WHEN status = 'completed' THEN 'processing' ELSE status END,
            completed_at = CASE WHEN status = 'completed' THEN NULL ELSE completed_at END,
            updated_at = now()
        WHERE id = v_batch_id;
        
        -- Increment the appropriate status counter for the new task
        CASE new_status
            WHEN 'pending' THEN
                UPDATE task_batches SET pending_tasks = pending_tasks + 1, updated_at = now()
                WHERE id = v_batch_id;
            WHEN 'processing' THEN
                UPDATE task_batches SET 
                    processing_tasks = processing_tasks + 1, 
                    started_at = COALESCE(started_at, now()),
                    status = 'processing',
                    updated_at = now()
                WHERE id = v_batch_id;
            WHEN 'completed' THEN
                UPDATE task_batches SET completed_tasks = completed_tasks + 1, updated_at = now()
                WHERE id = v_batch_id;
            WHEN 'failed' THEN
                UPDATE task_batches SET failed_tasks = failed_tasks + 1, updated_at = now()
                WHERE id = v_batch_id;
            ELSE NULL;
        END CASE;
        
        RETURN NEW;
    END IF;
    
    -- For UPDATE: Skip if status didn't change
    IF old_status = new_status THEN
        RETURN NEW;
    END IF;
    
    -- Decrement old status counter
    CASE old_status
        WHEN 'pending' THEN
            UPDATE task_batches SET pending_tasks = GREATEST(0, pending_tasks - 1), updated_at = now()
            WHERE id = v_batch_id;
        WHEN 'processing' THEN
            UPDATE task_batches SET processing_tasks = GREATEST(0, processing_tasks - 1), updated_at = now()
            WHERE id = v_batch_id;
        WHEN 'completed' THEN
            UPDATE task_batches SET completed_tasks = GREATEST(0, completed_tasks - 1), updated_at = now()
            WHERE id = v_batch_id;
        WHEN 'failed' THEN
            UPDATE task_batches SET failed_tasks = GREATEST(0, failed_tasks - 1), updated_at = now()
            WHERE id = v_batch_id;
        ELSE NULL;
    END CASE;
    
    -- Increment new status counter
    CASE new_status
        WHEN 'pending' THEN
            UPDATE task_batches SET pending_tasks = pending_tasks + 1, updated_at = now()
            WHERE id = v_batch_id;
        WHEN 'processing' THEN
            UPDATE task_batches SET 
                processing_tasks = processing_tasks + 1, 
                started_at = COALESCE(started_at, now()),
                status = 'processing',
                updated_at = now()
            WHERE id = v_batch_id;
        WHEN 'completed' THEN
            UPDATE task_batches SET completed_tasks = completed_tasks + 1, updated_at = now()
            WHERE id = v_batch_id;
        WHEN 'failed' THEN
            UPDATE task_batches SET failed_tasks = failed_tasks + 1, updated_at = now()
            WHERE id = v_batch_id;
        ELSE NULL;
    END CASE;
    
    -- Check if batch is complete (only on UPDATE, not INSERT)
    UPDATE task_batches SET
        status = CASE
            WHEN completed_tasks + failed_tasks >= total_tasks THEN 'completed'
            ELSE status
        END,
        completed_at = CASE
            WHEN completed_tasks + failed_tasks >= total_tasks THEN now()
            ELSE completed_at
        END
    WHERE id = v_batch_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger (no change needed, it already fires on INSERT OR UPDATE OF status)
DROP TRIGGER IF EXISTS trigger_update_batch_counters ON ai_tasks;

CREATE TRIGGER trigger_update_batch_counters
    AFTER INSERT OR UPDATE OF status ON ai_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_batch_counters();
