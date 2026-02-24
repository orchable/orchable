-- Migration: Tighten RLS for phase K (Authentication & User Isolation)
-- Created: 2026-02-23

-- 1. Add `is_public` column to task_batches to support sharing
ALTER TABLE public.task_batches ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 2. Drop previously permissive policies
DROP POLICY IF EXISTS "Permissive batch creation" ON public.task_batches;
DROP POLICY IF EXISTS "Permissive batch viewing" ON public.task_batches;
DROP POLICY IF EXISTS "Permissive batch updates" ON public.task_batches;
DROP POLICY IF EXISTS "Permissive batch deletion" ON public.task_batches;

DROP POLICY IF EXISTS "Permissive task creation" ON public.ai_tasks;
DROP POLICY IF EXISTS "Permissive task viewing" ON public.ai_tasks;
DROP POLICY IF EXISTS "Permissive task updates" ON public.ai_tasks;
DROP POLICY IF EXISTS "Permissive task deletion" ON public.ai_tasks;

-- 3. Create Restrictive Policies for task_batches (Isolated to creator OR public view)
CREATE POLICY "Users can create their own batches"
    ON public.task_batches FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own batches or public batches"
    ON public.task_batches FOR SELECT
    TO authenticated
    USING (auth.uid() = created_by OR is_public = true);

CREATE POLICY "Users can update their own batches"
    ON public.task_batches FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own batches"
    ON public.task_batches FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- 4. Create Restrictive Policies for ai_tasks
-- Using user_id directly or checking via the related batch
CREATE POLICY "Users can create their own tasks"
    ON public.ai_tasks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tasks or tasks in public batches"
    ON public.ai_tasks FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.task_batches b 
            WHERE b.id = batch_id AND b.is_public = true
        )
    );

CREATE POLICY "Users can update their own tasks"
    ON public.ai_tasks FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON public.ai_tasks FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Also Ensure RLS is enabled
ALTER TABLE public.task_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
