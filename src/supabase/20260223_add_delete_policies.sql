-- Migration: Add Delete Policies and Cascade Delete RPC for Task Batches
-- Created: 2026-02-23

-- 1. Ensure ai_tasks has an ON DELETE CASCADE constraint referencing task_batches
-- Currently, ai_tasks.batch_id references task_batches.id, but it might not have CASCADE.
-- Let's safely drop and recreate the constraint if it exists.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'ai_tasks'
          AND constraint_name = 'ai_tasks_batch_id_fkey'
    ) THEN
        ALTER TABLE public.ai_tasks DROP CONSTRAINT ai_tasks_batch_id_fkey;
    END IF;
END $$;

ALTER TABLE public.ai_tasks
    ADD CONSTRAINT ai_tasks_batch_id_fkey
    FOREIGN KEY (batch_id)
    REFERENCES public.task_batches(id)
    ON DELETE CASCADE;

-- 2. Add Delete Policies
-- Allow anyone to delete batches for MVP until Auth is fully implemented.
-- Once Auth is up, RLS migration will tighten this to `created_by = auth.uid()`.
DROP POLICY IF EXISTS "Permissive batch deletion" ON public.task_batches;

CREATE POLICY "Permissive batch deletion"
    ON public.task_batches FOR DELETE
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Permissive task deletion" ON public.ai_tasks;

CREATE POLICY "Permissive task deletion"
    ON public.ai_tasks FOR DELETE
    TO authenticated, anon
    USING (true);

-- 3. Create a clean RPC to handle the deletion Transactionally
CREATE OR REPLACE FUNCTION delete_batch_cascade(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Ensures the function runs with elevated privileges if needed
AS $$
BEGIN
    -- Due to ON DELETE CASCADE on the ai_tasks foreign key,
    -- simply deleting the batch will automatically delete all related ai_tasks.
    DELETE FROM public.task_batches WHERE id = p_batch_id;
END;
$$;
