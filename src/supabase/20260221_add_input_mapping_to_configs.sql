-- Migration: Add input_mapping to lab_orchestrator_configs
-- Purpose: Persist JSON input mapping and field selections (shared/per-task)

ALTER TABLE public.lab_orchestrator_configs 
ADD COLUMN IF NOT EXISTS input_mapping JSONB NULL;

COMMENT ON COLUMN public.lab_orchestrator_configs.input_mapping IS 'Stores JSON input configuration including file name, field selections (shared vs per-task), and manual field mappings.';
