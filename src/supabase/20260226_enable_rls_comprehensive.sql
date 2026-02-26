-- Migration: Comprehensive RLS Enablement
-- Created: 2026-02-26
-- Purpose: Ensure every table in the public schema has RLS enabled with appropriate policies

-- 1. Helper to enable RLS on all tables in public schema
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

--------------------------------------------------------------------------------
-- CATEGORY 1: User-Owned Data (Direct user/creator mapping)
--------------------------------------------------------------------------------

-- user_profiles (id = auth.uid())
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_api_keys (user_id = auth.uid())
DROP POLICY IF EXISTS "Users can manage own API keys" ON public.user_api_keys;
CREATE POLICY "Users can manage own API keys" ON public.user_api_keys FOR ALL TO authenticated USING (auth.uid() = user_id);

-- user_generated_resources, user_saved_resources, user_prompt_customizations, course_workspaces
DROP POLICY IF EXISTS "Users can manage own resources" ON public.user_generated_resources;
CREATE POLICY "Users can manage own resources" ON public.user_generated_resources FOR ALL TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage saved resources" ON public.user_saved_resources;
CREATE POLICY "Users can manage saved resources" ON public.user_saved_resources FOR ALL TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage customizations" ON public.user_prompt_customizations;
CREATE POLICY "Users can manage customizations" ON public.user_prompt_customizations FOR ALL TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage workspaces" ON public.course_workspaces;
CREATE POLICY "Users can manage workspaces" ON public.course_workspaces FOR ALL TO authenticated USING (auth.uid() = user_id);

-- orchestrator_executions, workflow_jobs (user_id as VARCHAR/UUID)
DROP POLICY IF EXISTS "Users can view own executions" ON public.orchestrator_executions;
CREATE POLICY "Users can view own executions" ON public.orchestrator_executions FOR SELECT TO authenticated USING (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS "Users can manage own jobs" ON public.workflow_jobs;
CREATE POLICY "Users can manage own jobs" ON public.workflow_jobs FOR ALL TO authenticated USING (auth.uid()::text = user_id::text);

--------------------------------------------------------------------------------
-- CATEGORY 2: Linked Data (Scoped via parent table)
--------------------------------------------------------------------------------

-- api_key_health & log (via user_api_keys)
DROP POLICY IF EXISTS "View own key health" ON public.api_key_health;
CREATE POLICY "View own key health" ON public.api_key_health FOR SELECT TO authenticated 
USING (user_api_key_id IN (SELECT id FROM public.user_api_keys WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "View own key usage logs" ON public.api_key_usage_log;
CREATE POLICY "View own key usage logs" ON public.api_key_usage_log FOR SELECT TO authenticated 
USING (user_api_key_id IN (SELECT id FROM public.user_api_keys WHERE user_id = auth.uid()));

-- workflow status tables (via workflow_jobs)
DROP POLICY IF EXISTS "View own workflow progress" ON public.workflow_progress;
CREATE POLICY "View own workflow progress" ON public.workflow_progress FOR SELECT TO authenticated 
USING (job_id IN (SELECT job_id FROM public.workflow_jobs WHERE user_id::text = auth.uid()::text));

DROP POLICY IF EXISTS "View own workflow errors" ON public.workflow_errors;
CREATE POLICY "View own workflow errors" ON public.workflow_errors FOR SELECT TO authenticated 
USING (job_id IN (SELECT job_id FROM public.workflow_jobs WHERE user_id::text = auth.uid()::text));

DROP POLICY IF EXISTS "View own workflow artifacts" ON public.workflow_resources;
CREATE POLICY "View own workflow artifacts" ON public.workflow_resources FOR SELECT TO authenticated 
USING (job_id IN (SELECT job_id FROM public.workflow_jobs WHERE user_id::text = auth.uid()::text));

--------------------------------------------------------------------------------
-- CATEGORY 3: Shared Static Data (Read-only for all auth users)
--------------------------------------------------------------------------------

DO $$ 
DECLARE 
    tbl_name TEXT;
    shared_tables TEXT[] := ARRAY[
        'curricula', 'curriculum_units', 'curriculum_units_v2', 'curriculum_modules', 'curriculum_lessons',
        'knowledge_trees', 'knowledge_categories', 'knowledge_subjects', 'knowledge_fields', 'knowledge_topics',
        'concepts', 'learning_objectives', 'learning_objective_concepts',
        'blueprint_presets', 'subject_fields', 'topic_categories', 'topic_learning_objectives', 'category_subjects',
        'orchestrators', 'orchestrator_phases', 'orchestrator_steps', 'workflow_registry', 'workflow_tasks'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY shared_tables LOOP
        EXECUTE 'DROP POLICY IF EXISTS "ReadOnlyForAuth" ON public.' || quote_ident(tbl_name);
        EXECUTE 'CREATE POLICY "ReadOnlyForAuth" ON public.' || quote_ident(tbl_name) || ' FOR SELECT TO authenticated USING (true)';
    END LOOP;
END $$;

--------------------------------------------------------------------------------
-- CATEGORY 4: Internal/Denied Data (No public access)
--------------------------------------------------------------------------------

-- alembic_version, celery_task_history, workflow_edit_locks
-- Enabled RLS without policies effectively denies all access by default.
-- We can add explicit deny policies if we want to be verbose but it's redundant.

--------------------------------------------------------------------------------
-- CATEGORY 5: Already Handled in recent migrations (Safety check)
--------------------------------------------------------------------------------
-- task_batches, ai_tasks, prompt_templates, lab_orchestrator_configs, custom_components, ai_model_settings
-- These were handled in 20260226_* files and already have robust policies.
