-- Migration: Optimize v_runnable_tasks for performance
-- Purpose: Remove heavy columns (template) to reduce Supabase -> n8n data transfer.
-- The n8n 'Load Batch' workflow now retrieves the full template from its local DataTable cache.

DROP VIEW IF EXISTS public.v_runnable_tasks;
CREATE VIEW public.v_runnable_tasks AS
SELECT
  t.id,
  COALESCE(t.task_type, (pt.stage_config ->> 'type'::text)::character varying) AS task_type,
  t.status,
  -- pt.template AS prompt, -- REMOVED: Managed by n8n DataTable for performance
  t.input_data,
  pt.default_ai_settings ->> 'model_id'::text AS model_id,
  ((pt.default_ai_settings -> 'generationConfig'::text) ->> 'temperature'::text)::numeric AS temperature,
  pt.default_ai_settings AS ai_settings,
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
  pt.next_stage_template_ids[1] AS next_stage_template_id,
  t.created_at,
  t.extra,
  t.split_group_id,
  t.user_id
FROM ai_tasks t
LEFT JOIN prompt_templates pt ON t.prompt_template_id = pt.id
LEFT JOIN ai_tasks parent ON t.parent_task_id = parent.id
WHERE t.status::text = 'pending'::text
  AND (t.parent_task_id IS NULL OR (parent.status::text = ANY (ARRAY['completed'::character varying, 'approved'::character varying]::text[])))
ORDER BY t.test_mode DESC, t.batch_priority, t.step_number, t.sequence;
