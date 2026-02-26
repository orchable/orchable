-- Migration: Fix Privacy Leaks and RLS Bypass
-- Created: 2026-02-26
-- Purpose: Recreate all database views with security_invoker = true so they respect RLS.
--          Tighten access policies for prompt_templates and ai_model_settings.

-- 1. Tighten ai_model_settings policies
-- First, ensure user_id is properly populated. If any are null, they should be global or deleted.
-- We'll assume existing null user_id rows are system defaults and leave them, but read policy must be tight.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ai_model_settings;
DROP POLICY IF EXISTS "Enable modify access for authenticated users" ON public.ai_model_settings;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.ai_model_settings;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.ai_model_settings;

-- Create strict user-scoped policies
CREATE POLICY "Users can manage own model settings" ON public.ai_model_settings 
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- System default models (where user_id is null) should be readable by everyone
CREATE POLICY "Users can view system default models" ON public.ai_model_settings 
FOR SELECT TO authenticated USING (user_id IS NULL);

-- 2. Tighten prompt_templates policies
-- Previously, some scripts might have defaulted is_public to true for null created_by.
-- We ensure that templates are only public if explicitly marked, readable by creator/admin,
-- OR if they have been shared to the Community Hub (hub_asset_id IS NOT NULL).
DROP POLICY IF EXISTS "Users can view own or public templates" ON public.prompt_templates;
CREATE POLICY "Users can view own or public templates" ON public.prompt_templates 
FOR SELECT TO authenticated USING (
    is_public = true 
    OR created_by = auth.uid() 
    OR public.is_admin()
    OR hub_asset_id IS NOT NULL
);

-- 3. Recreate views with security_invoker = true

-- v_runnable_tasks
DROP VIEW IF EXISTS public.v_runnable_tasks CASCADE;
CREATE VIEW public.v_runnable_tasks WITH (security_invoker = true) AS
SELECT
  t.id,
  COALESCE(t.task_type, (pt.stage_config ->> 'type'::text)::character varying) as task_type,
  t.status,
  t.input_data,
  pt.default_ai_settings ->> 'model_id'::text as model_id,
  ((pt.default_ai_settings -> 'generationConfig'::text) ->> 'temperature'::text)::numeric as temperature,
  pt.default_ai_settings as ai_settings,
  t.agent_id,
  t.batch_priority,
  t.test_mode,
  t.batch_id,
  t.launch_id,
  t.lo_code,
  t.sequence,
  t.phase_code,
  t.retry_count,
  t.step_id,
  t.parent_task_id,
  t.root_task_id,
  t.hierarchy_path,
  t.stage_key,
  t.step_number,
  t.total_steps,
  t.next_task_config,
  t.orchestrator_execution_id,
  t.step_execution_id,
  t.requires_approval,
  t.prompt_template_id,
  pt.next_stage_template_ids,
  pt.next_stage_template_ids[1] as next_stage_template_id,
  t.created_at,
  t.extra,
  t.split_group_id,
  t.user_id,
  b.status as batch_status,
  b.name as batch_name
FROM ai_tasks t
LEFT JOIN prompt_templates pt ON t.prompt_template_id = pt.id
LEFT JOIN ai_tasks parent ON t.parent_task_id = parent.id
LEFT JOIN task_batches b ON t.batch_id = b.id
WHERE t.status::text = 'plan'::text
  AND (
    t.parent_task_id is null
    OR (
      parent.status::text = any (array['completed'::text, 'generated'::text, 'approved'::text])
    )
  )
ORDER BY t.test_mode desc, t.batch_priority, t.step_number, t.sequence;

-- v_stuck_tasks
DROP VIEW IF EXISTS public.v_stuck_tasks CASCADE;
CREATE VIEW public.v_stuck_tasks WITH (security_invoker = true) AS
SELECT
  at.id AS task_id,
  at.batch_id,
  tb.name AS batch_name,
  tb.grade_code,
  at.lo_code,
  at.task_type,
  at.phase_code,
  at.error_message,
  at.retry_count,
  at.created_at,
  at.completed_at AS failed_at
FROM public.ai_tasks at
LEFT JOIN public.task_batches tb ON tb.id = at.batch_id
WHERE at.status::text = 'failed'::text AND at.retry_count >= 3
ORDER BY at.completed_at DESC;

-- v_failed_tasks_for_retry
DROP VIEW IF EXISTS public.v_failed_tasks_for_retry CASCADE;
CREATE VIEW public.v_failed_tasks_for_retry WITH (security_invoker = true) AS
SELECT
  at.id AS task_id,
  at.batch_id,
  tb.name AS batch_name,
  tb.grade_code,
  at.lo_code,
  at.task_type,
  at.error_message,
  at.retry_count,
  at.created_at,
  at.completed_at AS failed_at
FROM public.ai_tasks at
JOIN public.task_batches tb ON tb.id = at.batch_id
WHERE at.status::text = 'failed'::text AND at.retry_count < 3
ORDER BY at.completed_at DESC;

-- v_tasks_awaiting_approval
DROP VIEW IF EXISTS public.v_tasks_awaiting_approval CASCADE;
CREATE VIEW public.v_tasks_awaiting_approval WITH (security_invoker = true) AS
SELECT
  t.id,
  t.status,
  t.input_data,
  t.output_data,
  t.requires_approval,
  t.approved_at,
  t.approved_by,
  t.edit_notes,
  t.edited_output_data,
  t.prompt_template_id,
  t.batch_id,
  t.stage_key,
  t.sequence,
  t.total_steps,
  t.created_at,
  t.completed_at,
  b.name AS batch_name,
  b.grade_code,
  b.preset_key,
  pt.template AS prompt,
  pt.default_ai_settings AS ai_settings
FROM public.ai_tasks t
LEFT JOIN public.task_batches b ON t.batch_id = b.id
LEFT JOIN public.prompt_templates pt ON t.prompt_template_id = pt.id
WHERE t.status::text = 'awaiting_approval'::text;

-- ai_tasks_with_template
DROP VIEW IF EXISTS public.ai_tasks_with_template CASCADE;
CREATE VIEW public.ai_tasks_with_template WITH (security_invoker = true) AS
SELECT
  t.*,
  pt.template AS prompt_text,
  pt.stage_config,
  pt.default_ai_settings,
  pt.next_stage_template_ids
FROM public.ai_tasks t
LEFT JOIN public.prompt_templates pt ON t.prompt_template_id = pt.id;

-- v_processing_tasks
DROP VIEW IF EXISTS public.v_processing_tasks CASCADE;
CREATE VIEW public.v_processing_tasks WITH (security_invoker = true) AS
SELECT
  at.id AS task_id,
  at.batch_id,
  tb.name AS batch_name,
  tb.grade_code,
  at.lo_code,
  at.task_type,
  at.n8n_execution_id,
  at.started_at,
  EXTRACT(EPOCH FROM (now() - at.started_at))::integer AS running_seconds
FROM public.ai_tasks at
LEFT JOIN public.task_batches tb ON tb.id = at.batch_id
WHERE at.status::text = 'processing'::text
ORDER BY at.started_at DESC;

-- 4. Global Safety Net: Ensure all public schema tables have RLS enabled
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;
