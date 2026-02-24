create table public.task_batches (
  id uuid not null default gen_random_uuid (),
  name character varying(255) not null,
  source_file character varying(255) null,
  preset_key character varying(50) null,
  grade_code character varying(10) null,
  exam_round_code character varying(50) null,
  week_range character varying(20) null,
  total_tasks integer not null default 0,
  pending_tasks integer not null default 0,
  processing_tasks integer not null default 0,
  completed_tasks integer not null default 0,
  failed_tasks integer not null default 0,
  config jsonb null default '{}'::jsonb,
  status character varying(20) not null default 'pending'::character varying,
  n8n_workflow_id character varying(255) null,
  n8n_execution_id character varying(255) null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  updated_at timestamp with time zone null default now(),
  batch_type character varying(50) null default 'generic'::character varying,
  orchestrator_config_id uuid null,
  launch_id uuid null,
  finished_tasks integer null default 0,
  constraint task_batches_pkey primary key (id),
  constraint task_batches_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint task_batches_orchestrator_config_id_fkey foreign KEY (orchestrator_config_id) references lab_orchestrator_configs (id),
  constraint task_batches_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'processing'::character varying,
            'completed'::character varying,
            'failed'::character varying,
            'paused'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_task_batches_type on public.task_batches using btree (batch_type) TABLESPACE pg_default;

create index IF not exists idx_task_batches_config_id on public.task_batches using btree (orchestrator_config_id) TABLESPACE pg_default;

create index IF not exists idx_task_batches_launch_id on public.task_batches using btree (launch_id) TABLESPACE pg_default;

create index IF not exists idx_task_batches_status on public.task_batches using btree (status) TABLESPACE pg_default;

create index IF not exists idx_task_batches_grade on public.task_batches using btree (grade_code) TABLESPACE pg_default;

create index IF not exists idx_task_batches_preset on public.task_batches using btree (preset_key) TABLESPACE pg_default;