create table public.lab_executions (
  id uuid not null default gen_random_uuid (),
  config_id uuid not null,
  syllabus_row jsonb not null,
  status character varying(50) not null default 'pending'::character varying,
  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  error_message text null,
  total_steps integer null,
  completed_steps integer null default 0,
  failed_steps integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint lab_executions_pkey primary key (id),
  constraint lab_executions_config_id_fkey foreign KEY (config_id) references lab_orchestrator_configs (id)
) TABLESPACE pg_default;

create index IF not exists idx_lab_executions_status on public.lab_executions using btree (status) TABLESPACE pg_default;

create index IF not exists idx_lab_executions_created_at on public.lab_executions using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_lab_executions_config_id on public.lab_executions using btree (config_id) TABLESPACE pg_default;

create trigger update_lab_executions_updated_at BEFORE
update on lab_executions for EACH row
execute FUNCTION update_updated_at_column ();