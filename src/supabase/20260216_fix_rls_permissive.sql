-- Migration: Fix RLS Policies for task_batches and ai_tasks to be more permissive for authenticated users
-- Created: 2026-02-16

-- 1. task_batches policies
DROP POLICY IF EXISTS "Users can create batches" ON public.task_batches;
DROP POLICY IF EXISTS "Users can view own batches" ON public.task_batches;
DROP POLICY IF EXISTS "Anonymous access for unowned batches" ON public.task_batches;

-- Allow all authenticated AND anonymous users to insert (we can still set created_by for tracking)
CREATE POLICY "Permissive batch creation"
    ON public.task_batches FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Allow all authenticated AND anonymous users to view all batches
CREATE POLICY "Permissive batch viewing"
    ON public.task_batches FOR SELECT
    TO authenticated, anon
    USING (true);

-- Allow all authenticated AND anonymous users to update their batches
CREATE POLICY "Permissive batch updates"
    ON public.task_batches FOR UPDATE
    TO authenticated, anon
    USING (true);

-- 2. ai_tasks policies
DROP POLICY IF EXISTS "Users can create tasks" ON public.ai_tasks;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.ai_tasks;
DROP POLICY IF EXISTS "Users can update own pending tasks" ON public.ai_tasks;

-- Allow all authenticated AND anonymous users to create tasks
CREATE POLICY "Permissive task creation"
    ON public.ai_tasks FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Allow all authenticated AND anonymous users to view all tasks
CREATE POLICY "Permissive task viewing"
    ON public.ai_tasks FOR SELECT
    TO authenticated, anon
    USING (true);

-- Allow all authenticated AND anonymous users to update tasks
CREATE POLICY "Permissive task updates"
    ON public.ai_tasks FOR UPDATE
    TO authenticated, anon
    USING (true);
