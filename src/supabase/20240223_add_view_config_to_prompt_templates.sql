-- Migration: Add view_config to prompt_templates
-- Purpose: Store per-template view settings (like hidden columns)

ALTER TABLE public.prompt_templates 
ADD COLUMN IF NOT EXISTS view_config JSONB DEFAULT '{}'::jsonb;

-- Update existing records if needed (optional, already handled by DEFAULT)
COMMENT ON COLUMN public.prompt_templates.view_config IS 'Stores UI configuration for rendering task data (e.g., hiddenFields)';
