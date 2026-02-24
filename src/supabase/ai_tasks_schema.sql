create table public.ai_tasks (
  id uuid not null default gen_random_uuid (),
  task_type character varying(50) not null,
  status character varying(20) not null default 'pending'::character varying,
  input_data jsonb null default '{}'::jsonb,
  output_data jsonb null,
  error_message text null,
  user_id uuid null,
  n8n_execution_id character varying(100) null,
  created_at timestamp with time zone null default now(),
  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  orchestrator_tracking jsonb null,
  agent_id character varying(20) null default 'agent_1'::character varying,
  batch_priority timestamp with time zone null,
  test_mode boolean null default false,
  batch_id uuid null,
  lo_code character varying(100) null,
  sequence integer null,
  phase_code character varying(50) null,
  retry_count integer null default 0,
  step_id uuid null,
  parent_task_id uuid null,
  step_number integer null default 1,
  total_steps integer null,
  next_task_config jsonb null,
  orchestrator_execution_id uuid null,
  step_execution_id uuid null,
  requires_approval boolean null default false,
  approved_at timestamp with time zone null,
  approved_by uuid null,
  edited_output_data jsonb null,
  edit_notes text null,
  prompt_template_id text null,
  root_task_id uuid null,
  hierarchy_path jsonb null default '[]'::jsonb,
  stage_key character varying(50) null,
  extra jsonb null default '{}'::jsonb,
  split_group_id uuid null,
  launch_id uuid null,
  constraint ai_tasks_pkey primary key (id),
  constraint ai_tasks_orchestrator_execution_id_fkey foreign KEY (orchestrator_execution_id) references orchestrator_executions (id) on delete set null,
  constraint ai_tasks_parent_task_id_fkey foreign KEY (parent_task_id) references ai_tasks (id) on delete set null,
  constraint ai_tasks_prompt_template_id_fkey foreign KEY (prompt_template_id) references prompt_templates (id) on delete set null,
  constraint ai_tasks_root_task_id_fkey foreign KEY (root_task_id) references ai_tasks (id) on delete set null,
  constraint ai_tasks_step_execution_id_fkey foreign KEY (step_execution_id) references step_executions (id) on delete set null,
  constraint ai_tasks_step_id_fkey foreign KEY (step_id) references orchestrator_steps (id) on delete set null,
  constraint ai_tasks_approved_by_fkey foreign KEY (approved_by) references auth.users (id) on delete set null,
  constraint ai_tasks_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_launch_id on public.ai_tasks using btree (launch_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_status on public.ai_tasks using btree (status) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_user on public.ai_tasks using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_created on public.ai_tasks using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_priority on public.ai_tasks using btree (
  test_mode desc,
  batch_priority,
  agent_id,
  sequence
) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_agent on public.ai_tasks using btree (agent_id, status) TABLESPACE pg_default
where
  ((status)::text = 'pending'::text);

create index IF not exists idx_ai_tasks_batch on public.ai_tasks using btree (batch_id) TABLESPACE pg_default
where
  (batch_id is not null);

create index IF not exists idx_ai_tasks_batch_id on public.ai_tasks using btree (batch_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_batch_status on public.ai_tasks using btree (batch_id, status) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_lo_code on public.ai_tasks using btree (lo_code) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_step_id on public.ai_tasks using btree (step_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_parent_id on public.ai_tasks using btree (parent_task_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_step_number on public.ai_tasks using btree (step_number) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_orch_execution on public.ai_tasks using btree (orchestrator_execution_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_requires_approval on public.ai_tasks using btree (requires_approval) TABLESPACE pg_default
where
  (requires_approval = true);

create index IF not exists idx_ai_tasks_root_task on public.ai_tasks using btree (root_task_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_stage_key on public.ai_tasks using btree (stage_key) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_extra_gin on public.ai_tasks using gin (extra) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_split_group on public.ai_tasks using btree (split_group_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_prompt_template on public.ai_tasks using btree (prompt_template_id) TABLESPACE pg_default;

create trigger trigger_update_batch_counters
after INSERT
or
update OF status on ai_tasks for EACH row
execute FUNCTION update_task_batch_counters ();