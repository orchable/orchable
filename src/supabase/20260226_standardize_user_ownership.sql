-- Migration: Standardize User Ownership and UUID conversion (FIXED)
-- Created: 2026-02-26
-- Purpose: Ensure all personal data tables use UUID for user identification and link to auth.users
-- Note: Drops dependent policies first to avoid "cannot alter type of a column used in a policy definition"

-- 0. DROP DEPENDENT POLICIES (to allow type alteration)
DROP POLICY IF EXISTS "Users can manage own jobs" ON public.workflow_jobs;
DROP POLICY IF EXISTS "Users can view own executions" ON public.orchestrator_executions;

-- 1. Standardize batch_jobs (character varying -> uuid)
ALTER TABLE public.batch_jobs 
    ALTER COLUMN user_id TYPE uuid 
    USING (CASE 
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN user_id::uuid 
        ELSE NULL 
    END);
ALTER TABLE public.batch_jobs ADD CONSTRAINT batch_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Standardize orchestrator_executions (character varying -> uuid)
ALTER TABLE public.orchestrator_executions 
    ALTER COLUMN user_id TYPE uuid 
    USING (CASE 
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN user_id::uuid 
        ELSE NULL 
    END);
ALTER TABLE public.orchestrator_executions ADD CONSTRAINT orchestrator_executions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Standardize workflow_jobs (character varying -> uuid)
ALTER TABLE public.workflow_jobs 
    ALTER COLUMN user_id TYPE uuid 
    USING (CASE 
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN user_id::uuid 
        ELSE NULL 
    END);
ALTER TABLE public.workflow_jobs ADD CONSTRAINT workflow_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Standardize workflow_versions (created_by character varying -> uuid)
ALTER TABLE public.workflow_versions 
    ALTER COLUMN created_by TYPE uuid 
    USING (CASE 
        WHEN created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN created_by::uuid 
        ELSE NULL 
    END);
ALTER TABLE public.workflow_versions ADD CONSTRAINT workflow_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Add user_id to celery_task_history (currently missing ownership)
ALTER TABLE public.celery_task_history ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Add user_id to workflow_edit_locks (locked_by is character varying, add proper uuid column)
ALTER TABLE public.workflow_edit_locks ADD COLUMN IF NOT EXISTS locked_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. Add user_id to secondary result tables for easier filtering/RLS
ALTER TABLE public.step_executions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_progress ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_errors ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_resources ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_resource_specs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_syllabi ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.batch_questions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.api_key_health ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.api_key_usage_log ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. RESTORE POLICIES (with standardized types)
CREATE POLICY "Users can manage own jobs" ON public.workflow_jobs FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own executions" ON public.orchestrator_executions FOR SELECT TO authenticated USING (auth.uid() = user_id);
