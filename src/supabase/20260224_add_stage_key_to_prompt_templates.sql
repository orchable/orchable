-- Migration: Add stage_key to prompt_templates
-- Description: Required for orchestration routing in the universal agent.

ALTER TABLE public.prompt_templates ADD COLUMN IF NOT EXISTS stage_key TEXT;

COMMENT ON COLUMN public.prompt_templates.stage_key IS 'Identifies the logical stage key for routing and variable substitution.';
