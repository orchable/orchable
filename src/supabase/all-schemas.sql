-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ai_model_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  model_id text NOT NULL,
  name text NOT NULL,
  description text,
  temperature numeric DEFAULT 1.0,
  top_p numeric DEFAULT 0.95,
  top_k integer DEFAULT 40,
  max_output_tokens integer DEFAULT 8192,
  generate_content_api text DEFAULT 'generateContent'::text,
  timeout_ms integer DEFAULT 300000,
  retries integer DEFAULT 3,
  is_active boolean DEFAULT true,
  organization_code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category text,
  tagline text,
  supported_inputs jsonb DEFAULT '["Text"]'::jsonb,
  supported_outputs jsonb DEFAULT '["Text"]'::jsonb,
  input_token_limit integer DEFAULT 1048576,
  output_token_limit integer DEFAULT 65536,
  capabilities jsonb DEFAULT '{}'::jsonb,
  thinking_config_type text DEFAULT 'none'::text,
  recommended_thinking text,
  free_tier_rpm integer,
  free_tier_tpm integer,
  free_tier_rpd integer,
  use_case_tags jsonb DEFAULT '[]'::jsonb,
  user_id uuid,
  CONSTRAINT ai_model_settings_pkey PRIMARY KEY (id),
  CONSTRAINT ai_model_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.ai_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_type character varying NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'plan'::ai_task_status,
  input_data jsonb DEFAULT '{}'::jsonb,
  output_data jsonb,
  error_message text,
  user_id uuid,
  n8n_execution_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  orchestrator_tracking jsonb,
  agent_id character varying DEFAULT 'agent_1'::character varying,
  batch_priority timestamp with time zone,
  test_mode boolean DEFAULT false,
  batch_id uuid,
  lo_code character varying,
  sequence integer,
  phase_code character varying,
  retry_count integer DEFAULT 0,
  step_id uuid,
  parent_task_id uuid,
  step_number integer DEFAULT 1,
  total_steps integer,
  next_task_config jsonb,
  orchestrator_execution_id uuid,
  step_execution_id uuid,
  requires_approval boolean DEFAULT false,
  approved_at timestamp with time zone,
  approved_by uuid,
  edited_output_data jsonb,
  edit_notes text,
  prompt_template_id text,
  root_task_id uuid,
  hierarchy_path jsonb DEFAULT '[]'::jsonb,
  stage_key character varying,
  extra jsonb DEFAULT '{}'::jsonb,
  split_group_id uuid,
  launch_id uuid,
  CONSTRAINT ai_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT ai_tasks_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.orchestrator_steps(id),
  CONSTRAINT ai_tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.ai_tasks(id),
  CONSTRAINT ai_tasks_orchestrator_execution_id_fkey FOREIGN KEY (orchestrator_execution_id) REFERENCES public.orchestrator_executions(id),
  CONSTRAINT ai_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT ai_tasks_step_execution_id_fkey FOREIGN KEY (step_execution_id) REFERENCES public.step_executions(id),
  CONSTRAINT ai_tasks_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id),
  CONSTRAINT ai_tasks_root_task_id_fkey FOREIGN KEY (root_task_id) REFERENCES public.ai_tasks(id),
  CONSTRAINT ai_tasks_prompt_template_id_fkey FOREIGN KEY (prompt_template_id) REFERENCES public.prompt_templates(id),
  CONSTRAINT ai_tasks_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.task_batches(id)
);
CREATE TABLE public.alembic_version (
  version_num character varying NOT NULL,
  CONSTRAINT alembic_version_pkey PRIMARY KEY (version_num)
);
CREATE TABLE public.api_key_health (
  user_api_key_id uuid NOT NULL,
  last_used_at timestamp with time zone,
  last_success_at timestamp with time zone,
  last_failure_at timestamp with time zone,
  consecutive_failures integer NOT NULL DEFAULT 0,
  total_requests integer NOT NULL DEFAULT 0,
  successful_requests integer NOT NULL DEFAULT 0,
  failed_requests integer NOT NULL DEFAULT 0,
  blocked_until timestamp with time zone,
  block_reason character varying,
  last_error_code character varying,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  CONSTRAINT api_key_health_pkey PRIMARY KEY (user_api_key_id),
  CONSTRAINT api_key_health_user_api_key_id_fkey FOREIGN KEY (user_api_key_id) REFERENCES public.user_api_keys(id),
  CONSTRAINT api_key_health_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.api_key_usage_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_api_key_id uuid NOT NULL,
  task_id uuid,
  job_id uuid,
  request_type character varying,
  model_used character varying,
  tokens_used integer,
  success boolean,
  error_code character varying,
  error_message text,
  latency_ms integer,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata_json jsonb,
  user_id uuid,
  CONSTRAINT api_key_usage_log_pkey PRIMARY KEY (id),
  CONSTRAINT api_key_usage_log_user_api_key_id_fkey FOREIGN KEY (user_api_key_id) REFERENCES public.user_api_keys(id),
  CONSTRAINT api_key_usage_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.batch_jobs (
  id character varying NOT NULL,
  user_id uuid,
  user_email character varying,
  los_count integer,
  sheet_id character varying,
  sheet_url character varying,
  tab_name character varying,
  status character varying,
  created_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  questions_completed integer DEFAULT 0,
  questions_failed integer DEFAULT 0,
  error_message text,
  questions_per_lo integer DEFAULT 1,
  diversity_metrics jsonb,
  retry_count integer DEFAULT 0,
  CONSTRAINT batch_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT batch_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.batch_questions (
  id character varying NOT NULL,
  batch_id character varying NOT NULL,
  lo_code character varying,
  status character varying,
  question_data jsonb,
  error_message text,
  error_severity character varying,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone,
  completed_at timestamp with time zone,
  generated_count integer DEFAULT 1,
  user_id uuid,
  CONSTRAINT batch_questions_pkey PRIMARY KEY (id),
  CONSTRAINT batch_questions_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_jobs(id),
  CONSTRAINT batch_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.blueprint_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grade_code text NOT NULL,
  preset_key text NOT NULL,
  version integer DEFAULT 1,
  content text NOT NULL,
  lo_count integer DEFAULT 0,
  file_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT blueprint_presets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.category_subjects (
  category_code character varying NOT NULL,
  subject_code character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT category_subjects_pkey PRIMARY KEY (category_code, subject_code),
  CONSTRAINT category_subjects_category_code_fkey FOREIGN KEY (category_code) REFERENCES public.knowledge_categories(code),
  CONSTRAINT category_subjects_subject_code_fkey FOREIGN KEY (subject_code) REFERENCES public.knowledge_subjects(code)
);
CREATE TABLE public.celery_task_history (
  id uuid NOT NULL,
  task_id character varying NOT NULL UNIQUE,
  task_name character varying NOT NULL,
  state character varying NOT NULL,
  worker character varying,
  args jsonb,
  kwargs jsonb,
  result jsonb,
  exception text,
  traceback text,
  received_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  runtime_seconds double precision,
  retries double precision,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT celery_task_history_pkey PRIMARY KEY (id),
  CONSTRAINT celery_task_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.concepts (
  code character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  category character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT concepts_pkey PRIMARY KEY (code)
);
CREATE TABLE public.course_workspaces (
  id integer NOT NULL DEFAULT nextval('course_workspaces_id_seq'::regclass),
  name character varying NOT NULL,
  description text,
  user_id uuid NOT NULL,
  curriculum_id integer,
  knowledge_tree_id integer,
  course_context jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_workspaces_pkey PRIMARY KEY (id),
  CONSTRAINT course_workspaces_curriculum_id_fkey FOREIGN KEY (curriculum_id) REFERENCES public.curricula(id),
  CONSTRAINT course_workspaces_knowledge_tree_id_fkey FOREIGN KEY (knowledge_tree_id) REFERENCES public.knowledge_trees(id),
  CONSTRAINT course_workspaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.curricula (
  id integer NOT NULL DEFAULT nextval('curricula_id_seq'::regclass),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT curricula_pkey PRIMARY KEY (id)
);
CREATE TABLE public.curriculum_lessons (
  id integer NOT NULL DEFAULT nextval('curriculum_lessons_id_seq'::regclass),
  curriculum_id integer NOT NULL,
  lesson_code character varying NOT NULL UNIQUE,
  lesson_name character varying NOT NULL,
  unit_code character varying,
  unit_name character varying,
  module_name character varying,
  activities_json jsonb NOT NULL,
  display_order integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  module_code character varying,
  CONSTRAINT curriculum_lessons_pkey PRIMARY KEY (id),
  CONSTRAINT curriculum_lessons_curriculum_id_fkey FOREIGN KEY (curriculum_id) REFERENCES public.curricula(id)
);
CREATE TABLE public.curriculum_modules (
  id integer NOT NULL DEFAULT nextval('curriculum_modules_id_seq'::regclass),
  unit_id integer NOT NULL,
  module_code character varying NOT NULL,
  module_name character varying NOT NULL,
  approach character varying NOT NULL,
  context jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT curriculum_modules_pkey PRIMARY KEY (id),
  CONSTRAINT curriculum_modules_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.curriculum_units_v2(id)
);
CREATE TABLE public.curriculum_units (
  id integer NOT NULL DEFAULT nextval('curriculum_units_id_seq'::regclass),
  curriculum_id integer NOT NULL,
  unit_code character varying NOT NULL,
  unit_name character varying NOT NULL,
  module_code character varying,
  module_name character varying,
  display_order integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT curriculum_units_pkey PRIMARY KEY (id),
  CONSTRAINT curriculum_units_curriculum_id_fkey FOREIGN KEY (curriculum_id) REFERENCES public.curricula(id)
);
CREATE TABLE public.curriculum_units_v2 (
  id integer NOT NULL DEFAULT nextval('curriculum_units_v2_id_seq'::regclass),
  workspace_id integer NOT NULL,
  unit_code character varying NOT NULL,
  unit_name character varying NOT NULL,
  context jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT curriculum_units_v2_pkey PRIMARY KEY (id),
  CONSTRAINT curriculum_units_v2_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.course_workspaces(id)
);
CREATE TABLE public.custom_components (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  code text NOT NULL,
  mock_data jsonb DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  hub_asset_id uuid,
  CONSTRAINT custom_components_pkey PRIMARY KEY (id),
  CONSTRAINT custom_components_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT custom_components_hub_asset_id_fkey FOREIGN KEY (hub_asset_id) REFERENCES public.hub_assets(id)
);
CREATE TABLE public.hub_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  asset_type text NOT NULL CHECK (asset_type = ANY (ARRAY['orchestration'::text, 'template'::text, 'component'::text, 'ai_preset'::text, 'bundle'::text])),
  ref_id uuid NOT NULL,
  creator_id uuid,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  tags ARRAY DEFAULT '{}'::text[],
  thumbnail_url text,
  source_asset_id uuid,
  parent_asset_id uuid,
  remix_depth integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  is_hidden boolean NOT NULL DEFAULT false,
  license text NOT NULL DEFAULT 'orchable-free'::text,
  price_cents integer NOT NULL DEFAULT 0,
  stripe_product_id text,
  install_count integer NOT NULL DEFAULT 0,
  star_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT hub_assets_pkey PRIMARY KEY (id),
  CONSTRAINT hub_assets_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES auth.users(id),
  CONSTRAINT hub_assets_source_asset_id_fkey FOREIGN KEY (source_asset_id) REFERENCES public.hub_assets(id),
  CONSTRAINT hub_assets_parent_asset_id_fkey FOREIGN KEY (parent_asset_id) REFERENCES public.hub_assets(id)
);
CREATE TABLE public.hub_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  asset_id uuid,
  reporter_id uuid,
  reason text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  CONSTRAINT hub_reports_pkey PRIMARY KEY (id),
  CONSTRAINT hub_reports_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.hub_assets(id),
  CONSTRAINT hub_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id),
  CONSTRAINT hub_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id)
);
CREATE TABLE public.hub_stars (
  asset_id uuid NOT NULL,
  user_id uuid NOT NULL,
  starred_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT hub_stars_pkey PRIMARY KEY (asset_id, user_id),
  CONSTRAINT hub_stars_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.hub_assets(id),
  CONSTRAINT hub_stars_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.knowledge_categories (
  code character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  display_order integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_categories_pkey PRIMARY KEY (code)
);
CREATE TABLE public.knowledge_fields (
  code character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  display_order integer,
  keywords ARRAY,
  cs2023_ka_mapping character varying,
  meta_data json,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_fields_pkey PRIMARY KEY (code)
);
CREATE TABLE public.knowledge_subjects (
  code character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  keywords ARRAY,
  cs2023_ka_mapping character varying,
  meta_data json,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_subjects_pkey PRIMARY KEY (code)
);
CREATE TABLE public.knowledge_topics (
  code character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  display_order integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_topics_pkey PRIMARY KEY (code)
);
CREATE TABLE public.knowledge_trees (
  id integer NOT NULL DEFAULT nextval('knowledge_trees_id_seq'::regclass),
  name character varying NOT NULL,
  version character varying,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_trees_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lab_orchestrator_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  steps jsonb NOT NULL CHECK (jsonb_typeof(steps) = 'array'::text),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  viewport jsonb DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  n8n_workflow_id text,
  input_mapping jsonb,
  hub_asset_id uuid,
  is_public boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  CONSTRAINT lab_orchestrator_configs_pkey PRIMARY KEY (id),
  CONSTRAINT lab_orchestrator_configs_hub_asset_id_fkey FOREIGN KEY (hub_asset_id) REFERENCES public.hub_assets(id),
  CONSTRAINT lab_orchestrator_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.learning_objective_concepts (
  lo_code character varying NOT NULL,
  concept_code character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT learning_objective_concepts_pkey PRIMARY KEY (lo_code, concept_code),
  CONSTRAINT learning_objective_concepts_lo_code_fkey FOREIGN KEY (lo_code) REFERENCES public.learning_objectives(code),
  CONSTRAINT learning_objective_concepts_concept_code_fkey FOREIGN KEY (concept_code) REFERENCES public.concepts(code)
);
CREATE TABLE public.learning_objectives (
  code character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  lo_type character varying NOT NULL,
  parent_lo_code character varying,
  concept_codes ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT learning_objectives_pkey PRIMARY KEY (code),
  CONSTRAINT learning_objectives_parent_lo_code_fkey FOREIGN KEY (parent_lo_code) REFERENCES public.learning_objectives(code)
);
CREATE TABLE public.orchestrator_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  orchestrator_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_email character varying,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'running'::character varying, 'awaiting_approval'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying]::text[])),
  current_phase_id uuid,
  current_step_id uuid,
  input_data jsonb NOT NULL,
  output_data jsonb,
  error_message text,
  error_phase_id uuid,
  error_step_id uuid,
  n8n_execution_id character varying,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orchestrator_executions_pkey PRIMARY KEY (id),
  CONSTRAINT orchestrator_executions_orchestrator_id_fkey FOREIGN KEY (orchestrator_id) REFERENCES public.orchestrators(id),
  CONSTRAINT orchestrator_executions_current_phase_id_fkey FOREIGN KEY (current_phase_id) REFERENCES public.orchestrator_phases(id),
  CONSTRAINT orchestrator_executions_current_step_id_fkey FOREIGN KEY (current_step_id) REFERENCES public.orchestrator_steps(id),
  CONSTRAINT orchestrator_executions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.orchestrator_phases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  orchestrator_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  order_index integer NOT NULL,
  n8n_workflow_id character varying,
  n8n_webhook_path character varying,
  requires_approval boolean DEFAULT false,
  approval_message text,
  on_error character varying DEFAULT 'stop'::character varying CHECK (on_error::text = ANY (ARRAY['stop'::character varying, 'skip'::character varying, 'fallback'::character varying]::text[])),
  fallback_workflow_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orchestrator_phases_pkey PRIMARY KEY (id),
  CONSTRAINT orchestrator_phases_orchestrator_id_fkey FOREIGN KEY (orchestrator_id) REFERENCES public.orchestrators(id)
);
CREATE TABLE public.orchestrator_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  order_index integer NOT NULL,
  n8n_workflow_id character varying,
  n8n_webhook_path character varying,
  handler_endpoint character varying,
  timeout_seconds integer DEFAULT 300,
  retry_count integer DEFAULT 3,
  input_schema jsonb,
  output_schema jsonb,
  created_at timestamp with time zone DEFAULT now(),
  runner_type character varying NOT NULL DEFAULT 'n8n'::character varying,
  workflow_file character varying,
  CONSTRAINT orchestrator_steps_pkey PRIMARY KEY (id),
  CONSTRAINT orchestrator_steps_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.orchestrator_phases(id)
);
CREATE TABLE public.orchestrators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  icon character varying,
  category character varying NOT NULL,
  is_template boolean DEFAULT true,
  template_id uuid,
  created_by uuid,
  is_system boolean DEFAULT false,
  status character varying DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'active'::character varying, 'archived'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orchestrators_pkey PRIMARY KEY (id),
  CONSTRAINT orchestrators_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.orchestrators(id),
  CONSTRAINT orchestrators_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.prompt_templates (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  template text NOT NULL,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  input_schema jsonb,
  output_schema jsonb,
  default_ai_settings jsonb DEFAULT '{"model_id": "gemini-2.5-flash", "temperature": 0.7}'::jsonb,
  organization_code text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  next_stage_template_id text,
  stage_config jsonb DEFAULT '{}'::jsonb,
  requires_approval boolean DEFAULT false,
  next_stage_template_ids jsonb DEFAULT '[]'::jsonb,
  custom_component_id uuid,
  view_config jsonb DEFAULT '{}'::jsonb,
  stage_key text,
  hub_asset_id uuid,
  is_public boolean DEFAULT false,
  CONSTRAINT prompt_templates_pkey PRIMARY KEY (id),
  CONSTRAINT prompt_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT prompt_templates_next_stage_fkey FOREIGN KEY (next_stage_template_id) REFERENCES public.prompt_templates(id),
  CONSTRAINT prompt_templates_custom_component_id_fkey FOREIGN KEY (custom_component_id) REFERENCES public.custom_components(id),
  CONSTRAINT prompt_templates_hub_asset_id_fkey FOREIGN KEY (hub_asset_id) REFERENCES public.hub_assets(id)
);
CREATE TABLE public.step_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL,
  step_id uuid NOT NULL,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'skipped'::character varying, 'awaiting_approval'::character varying]::text[])),
  n8n_execution_id character varying,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_ms integer,
  input_data jsonb,
  output_data jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  lobster_token character varying,
  user_id uuid,
  CONSTRAINT step_executions_pkey PRIMARY KEY (id),
  CONSTRAINT step_executions_execution_id_fkey FOREIGN KEY (execution_id) REFERENCES public.orchestrator_executions(id),
  CONSTRAINT step_executions_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.orchestrator_steps(id),
  CONSTRAINT step_executions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.subject_fields (
  subject_code character varying NOT NULL,
  field_code character varying NOT NULL,
  is_primary integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subject_fields_pkey PRIMARY KEY (subject_code, field_code),
  CONSTRAINT subject_fields_subject_code_fkey FOREIGN KEY (subject_code) REFERENCES public.knowledge_subjects(code),
  CONSTRAINT subject_fields_field_code_fkey FOREIGN KEY (field_code) REFERENCES public.knowledge_fields(code)
);
CREATE TABLE public.system_prompt_history (
  id uuid NOT NULL,
  prompt_key character varying NOT NULL,
  override_template text NOT NULL,
  edited_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  override_id uuid,
  CONSTRAINT system_prompt_history_pkey PRIMARY KEY (id),
  CONSTRAINT system_prompt_history_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.user_profiles(id),
  CONSTRAINT system_prompt_history_override_id_fkey FOREIGN KEY (override_id) REFERENCES public.system_prompt_overrides(id)
);
CREATE TABLE public.system_prompt_overrides (
  id uuid NOT NULL,
  prompt_key character varying NOT NULL,
  override_template text NOT NULL,
  edited_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_prompt_overrides_pkey PRIMARY KEY (id),
  CONSTRAINT system_prompt_overrides_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.task_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  source_file character varying,
  preset_key character varying,
  grade_code character varying,
  exam_round_code character varying,
  week_range character varying,
  total_tasks integer NOT NULL DEFAULT 0,
  pending_tasks integer NOT NULL DEFAULT 0,
  processing_tasks integer NOT NULL DEFAULT 0,
  completed_tasks integer NOT NULL DEFAULT 0,
  failed_tasks integer NOT NULL DEFAULT 0,
  config jsonb DEFAULT '{}'::jsonb,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'paused'::character varying]::text[])),
  n8n_workflow_id character varying,
  n8n_execution_id character varying,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  batch_type character varying DEFAULT 'generic'::character varying,
  orchestrator_config_id uuid,
  launch_id uuid,
  finished_tasks integer DEFAULT 0,
  is_public boolean DEFAULT false,
  CONSTRAINT task_batches_pkey PRIMARY KEY (id),
  CONSTRAINT task_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT task_batches_orchestrator_config_id_fkey FOREIGN KEY (orchestrator_config_id) REFERENCES public.lab_orchestrator_configs(id)
);
CREATE TABLE public.task_sync_barriers (
  sync_group_id uuid NOT NULL,
  expected_count integer NOT NULL,
  merge_strategy text,
  next_template_id text,
  completed_count integer DEFAULT 0,
  waiting_task_ids jsonb DEFAULT '[]'::jsonb,
  is_ready boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_sync_barriers_pkey PRIMARY KEY (sync_group_id)
);
CREATE TABLE public.topic_categories (
  topic_code character varying NOT NULL,
  category_code character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT topic_categories_pkey PRIMARY KEY (topic_code, category_code),
  CONSTRAINT topic_categories_topic_code_fkey FOREIGN KEY (topic_code) REFERENCES public.knowledge_topics(code),
  CONSTRAINT topic_categories_category_code_fkey FOREIGN KEY (category_code) REFERENCES public.knowledge_categories(code)
);
CREATE TABLE public.topic_learning_objectives (
  topic_code character varying NOT NULL,
  lo_code character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT topic_learning_objectives_pkey PRIMARY KEY (topic_code, lo_code),
  CONSTRAINT topic_learning_objectives_topic_code_fkey FOREIGN KEY (topic_code) REFERENCES public.knowledge_topics(code),
  CONSTRAINT topic_learning_objectives_lo_code_fkey FOREIGN KEY (lo_code) REFERENCES public.learning_objectives(code)
);
CREATE TABLE public.user_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_name character varying NOT NULL,
  api_key_encrypted text NOT NULL,
  model_preference character varying NOT NULL DEFAULT 'gemini-2.5-flash'::character varying,
  thinking_mode_enabled boolean NOT NULL DEFAULT false,
  thinking_token_limit integer NOT NULL DEFAULT 8000,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  pool_type USER-DEFINED DEFAULT 'personal'::api_key_pool_type,
  CONSTRAINT user_api_keys_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_generated_resources (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  resource_type character varying NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL,
  CONSTRAINT user_generated_resources_pkey PRIMARY KEY (id),
  CONSTRAINT user_generated_resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role USER-DEFINED NOT NULL DEFAULT 'user'::user_role,
  avatar_url text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  username text UNIQUE,
  settings jsonb,
  tier character varying DEFAULT 'free'::character varying,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_prompt_customizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt_key character varying NOT NULL,
  custom_template character varying NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_prompt_customizations_pkey PRIMARY KEY (id),
  CONSTRAINT user_prompt_customizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_saved_resources (
  resource_id uuid NOT NULL,
  user_id uuid NOT NULL,
  resource_code character varying NOT NULL,
  title text,
  content text,
  supabase_path character varying NOT NULL,
  metadata_json jsonb,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  CONSTRAINT user_saved_resources_pkey PRIMARY KEY (resource_id),
  CONSTRAINT user_saved_resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier character varying NOT NULL DEFAULT 'free'::character varying CHECK (tier::text = ANY (ARRAY['free'::character varying, 'premium'::character varying]::text[])),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month character varying NOT NULL,
  task_count integer DEFAULT 0,
  token_input_count bigint DEFAULT 0,
  token_output_count bigint DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_usage_pkey PRIMARY KEY (id),
  CONSTRAINT user_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.workflow_edit_locks (
  lock_id uuid NOT NULL,
  entity_type character varying NOT NULL CHECK (entity_type::text = ANY (ARRAY['syllabus'::character varying, 'resource_spec'::character varying]::text[])),
  entity_id uuid NOT NULL,
  locked_by character varying NOT NULL,
  locked_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  locked_by_id uuid,
  CONSTRAINT workflow_edit_locks_pkey PRIMARY KEY (lock_id),
  CONSTRAINT workflow_edit_locks_locked_by_id_fkey FOREIGN KEY (locked_by_id) REFERENCES auth.users(id)
);
CREATE TABLE public.workflow_errors (
  error_id uuid NOT NULL,
  job_id uuid NOT NULL,
  phase character varying NOT NULL,
  error_type character varying NOT NULL,
  error_message text NOT NULL,
  context_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT workflow_errors_pkey PRIMARY KEY (error_id),
  CONSTRAINT workflow_errors_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.workflow_jobs(job_id),
  CONSTRAINT workflow_errors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.workflow_jobs (
  job_id uuid NOT NULL,
  user_id uuid,
  user_email character varying NOT NULL,
  state character varying NOT NULL CHECK (state::text = ANY (ARRAY['init'::character varying, 'generating_syllabi'::character varying, 'awaiting_syllabus_review'::character varying, 'generating_resource_specs'::character varying, 'awaiting_resource_review'::character varying, 'generating_resources'::character varying, 'generating_guides'::character varying, 'packaging'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'paused_no_keys'::character varying]::text[])),
  course_config jsonb NOT NULL,
  api_key_encrypted text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  celery_task_id character varying,
  n8n_workflow_id character varying,
  n8n_execution_id character varying,
  use_n8n boolean,
  task_id uuid,
  discovery_context jsonb,
  selected_resources jsonb,
  resource_list jsonb,
  readiness_status jsonb DEFAULT '{}'::jsonb,
  coherence_reports jsonb,
  teacher_guide text,
  student_guide text,
  package_url character varying,
  CONSTRAINT workflow_jobs_pkey PRIMARY KEY (job_id),
  CONSTRAINT fk_workflow_jobs_task_id FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(task_id),
  CONSTRAINT workflow_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.workflow_progress (
  progress_id uuid NOT NULL,
  job_id uuid NOT NULL,
  phase character varying NOT NULL,
  total_items integer NOT NULL,
  completed_items integer DEFAULT 0,
  progress_percentage double precision DEFAULT '0'::double precision,
  status character varying DEFAULT 'in_progress'::character varying,
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT workflow_progress_pkey PRIMARY KEY (progress_id),
  CONSTRAINT workflow_progress_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.workflow_jobs(job_id),
  CONSTRAINT workflow_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.workflow_registry (
  registry_id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid,
  n8n_workflow_id character varying NOT NULL UNIQUE,
  workflow_name character varying NOT NULL,
  workflow_description text,
  is_active boolean DEFAULT false,
  webhook_path character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  synced_at timestamp with time zone,
  CONSTRAINT workflow_registry_pkey PRIMARY KEY (registry_id),
  CONSTRAINT workflow_registry_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.workflow_tasks(task_id)
);
CREATE TABLE public.workflow_resource_specs (
  spec_id uuid NOT NULL,
  job_id uuid NOT NULL,
  version integer,
  status character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'awaiting_review'::character varying, 'reviewed'::character varying, 'approved'::character varying]::text[])),
  review_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  unit_index integer NOT NULL,
  spec_content jsonb NOT NULL,
  validation_score double precision DEFAULT '0'::double precision,
  validation_errors jsonb DEFAULT '[]'::jsonb,
  validation_warnings jsonb DEFAULT '[]'::jsonb,
  learning_objective_codes ARRAY DEFAULT '{}'::character varying[],
  user_id uuid,
  CONSTRAINT workflow_resource_specs_pkey PRIMARY KEY (spec_id),
  CONSTRAINT workflow_resource_specs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.workflow_jobs(job_id),
  CONSTRAINT workflow_resource_specs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.workflow_resources (
  resource_id uuid NOT NULL,
  job_id uuid NOT NULL,
  lesson_id character varying NOT NULL,
  resource_type character varying NOT NULL CHECK (resource_type::text = ANY (ARRAY['lesson_plan'::character varying, 'activity'::character varying, 'question'::character varying, 'slide'::character varying, 'asset'::character varying, 'glossary'::character varying]::text[])),
  content jsonb,
  file_path character varying,
  created_at timestamp with time zone DEFAULT now(),
  unit_index integer NOT NULL,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  status character varying DEFAULT 'generated'::character varying,
  user_id uuid,
  CONSTRAINT workflow_resources_pkey PRIMARY KEY (resource_id),
  CONSTRAINT workflow_resources_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.workflow_jobs(job_id),
  CONSTRAINT workflow_resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.workflow_syllabi (
  syllabus_id uuid NOT NULL,
  job_id uuid NOT NULL,
  unit_index integer NOT NULL,
  unit_name character varying NOT NULL,
  approach character varying NOT NULL CHECK (approach::text = ANY (ARRAY['PBL'::character varying, 'LbDP'::character varying]::text[])),
  content text NOT NULL,
  version integer,
  status character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'awaiting_review'::character varying, 'reviewed'::character varying, 'approved'::character varying]::text[])),
  review_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT workflow_syllabi_pkey PRIMARY KEY (syllabus_id),
  CONSTRAINT workflow_syllabi_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.workflow_jobs(job_id),
  CONSTRAINT workflow_syllabi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.workflow_tasks (
  task_id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_key character varying NOT NULL UNIQUE,
  task_name character varying NOT NULL,
  task_description text,
  icon_name character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  is_system boolean DEFAULT false,
  CONSTRAINT workflow_tasks_pkey PRIMARY KEY (task_id),
  CONSTRAINT workflow_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.workflow_versions (
  version_id uuid NOT NULL,
  entity_type character varying NOT NULL CHECK (entity_type::text = ANY (ARRAY['syllabus'::character varying, 'resource_spec'::character varying]::text[])),
  entity_id uuid NOT NULL,
  version_number integer NOT NULL,
  content text NOT NULL,
  created_by uuid,
  change_notes text,
  is_approved boolean,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workflow_versions_pkey PRIMARY KEY (version_id),
  CONSTRAINT workflow_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);