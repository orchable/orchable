-- Migration: Standardize User Ownership and UUID conversion (FIXED v2)
-- Created: 2026-02-26
-- Purpose: Ensure all personal data tables use UUID for user identification and link to auth.users
-- Note: Drops ALL dependent policies (including cross-table subqueries) to avoid alteration errors.

-- 0. DROP ALL DEPENDENT POLICIES
-- Policies on primary tables
DROP POLICY IF EXISTS "Users can manage own jobs" ON public.workflow_jobs;
DROP POLICY IF EXISTS "Users can view own executions" ON public.orchestrator_executions;

-- Policies on secondary tables that reference primary table user_id columns
DROP POLICY IF EXISTS "View own workflow progress" ON public.workflow_progress;
DROP POLICY IF EXISTS "View own workflow errors" ON public.workflow_errors;
DROP POLICY IF EXISTS "View own workflow artifacts" ON public.workflow_resources;
DROP POLICY IF EXISTS "View own key health" ON public.api_key_health;
DROP POLICY IF EXISTS "View own key usage logs" ON public.api_key_usage_log;

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

-- 6. Add user_id to workflow_edit_locks
ALTER TABLE public.workflow_edit_locks ADD COLUMN IF NOT EXISTS locked_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. Add user_id to secondary result tables
ALTER TABLE public.step_executions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_progress ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_errors ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_resources ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_resource_specs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_syllabi ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.batch_questions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.api_key_health ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.api_key_usage_log ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. RESTORE ALL POLICIES (optimized for UUID)
CREATE POLICY "Users can manage own jobs" ON public.workflow_jobs FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own executions" ON public.orchestrator_executions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "View own workflow progress" ON public.workflow_progress FOR SELECT TO authenticated 
USING (job_id IN (SELECT job_id FROM public.workflow_jobs WHERE user_id = auth.uid()));

CREATE POLICY "View own workflow errors" ON public.workflow_errors FOR SELECT TO authenticated 
USING (job_id IN (SELECT job_id FROM public.workflow_jobs WHERE user_id = auth.uid()));

CREATE POLICY "View own workflow artifacts" ON public.workflow_resources FOR SELECT TO authenticated 
USING (job_id IN (SELECT job_id FROM public.workflow_jobs WHERE user_id = auth.uid()));

CREATE POLICY "View own key health" ON public.api_key_health FOR SELECT TO authenticated 
USING (user_api_key_id IN (SELECT id FROM public.user_api_keys WHERE user_id = auth.uid()));

CREATE POLICY "View own key usage logs" ON public.api_key_usage_log FOR SELECT TO authenticated 
USING (user_api_key_id IN (SELECT id FROM public.user_api_keys WHERE user_id = auth.uid()));
