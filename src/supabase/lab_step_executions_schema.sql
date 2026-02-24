create table public.lab_step_executions (
  id uuid not null default gen_random_uuid (),
  execution_id uuid not null,
  step_id character varying(50) not null,
  step_name character varying(10) not null,
  status character varying(50) not null default 'pending'::character varying,
  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  result jsonb null,
  error_message text null,
  retry_count integer null default 0,
  max_retries integer null default 3,
  n8n_execution_id character varying(255) null,
  duration_ms integer null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint lab_step_executions_pkey primary key (id),
  constraint lab_step_executions_execution_id_step_id_key unique (execution_id, step_id),
  constraint lab_step_executions_execution_id_fkey foreign KEY (execution_id) references lab_executions (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_lab_step_executions_execution_id on public.lab_step_executions using btree (execution_id) TABLESPACE pg_default;

create index IF not exists idx_lab_step_executions_status on public.lab_step_executions using btree (status) TABLESPACE pg_default;

create index IF not exists idx_lab_step_executions_step_id on public.lab_step_executions using btree (step_id) TABLESPACE pg_default;

create trigger update_lab_step_executions_updated_at BEFORE
update on lab_step_executions for EACH row
execute FUNCTION update_updated_at_column ();