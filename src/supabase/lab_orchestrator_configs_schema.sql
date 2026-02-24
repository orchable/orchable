create table public.lab_orchestrator_configs (
  id uuid not null default gen_random_uuid (),
  name character varying(255) not null,
  description text null,
  steps jsonb not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by character varying(255) null,
  viewport jsonb null default '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  n8n_workflow_id text null,
  constraint lab_orchestrator_configs_pkey primary key (id),
  constraint valid_steps check ((jsonb_typeof(steps) = 'array'::text))
) TABLESPACE pg_default;

create index IF not exists idx_lab_configs_created_at on public.lab_orchestrator_configs using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_lab_configs_name on public.lab_orchestrator_configs using btree (name) TABLESPACE pg_default;