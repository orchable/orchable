create table public.prompt_templates (
  id text not null,
  name text not null,
  description text null,
  template text not null,
  version integer null default 1,
  is_active boolean null default true,
  input_schema jsonb null,
  output_schema jsonb null,
  default_ai_settings jsonb null default '{"model_id": "gemini-2.5-flash", "temperature": 0.7}'::jsonb,
  organization_code text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  next_stage_template_id text null,
  stage_config jsonb null default '{}'::jsonb,
  requires_approval boolean null default false,
  next_stage_template_ids jsonb null default '[]'::jsonb,
  custom_component_id uuid null,
  view_config jsonb null default '{}'::jsonb,
  stage_key text null, -- Added for orchestration routing
  constraint prompt_templates_pkey primary key (id),
  constraint prompt_templates_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint prompt_templates_custom_component_id_fkey foreign KEY (custom_component_id) references custom_components (id) on delete set null,
  constraint prompt_templates_next_stage_fkey foreign KEY (next_stage_template_id) references prompt_templates (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_prompt_templates_org on public.prompt_templates using btree (organization_code) TABLESPACE pg_default;

create index IF not exists idx_prompt_templates_active on public.prompt_templates using btree (is_active) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_prompt_templates_next_stage on public.prompt_templates using btree (next_stage_template_id) TABLESPACE pg_default;

create index IF not exists idx_prompt_templates_stage_config on public.prompt_templates using gin (stage_config) TABLESPACE pg_default;

create index IF not exists idx_prompt_templates_stage_key on public.prompt_templates using btree (stage_key) TABLESPACE pg_default;
