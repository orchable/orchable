-- Migration: Fix ai_model_settings schema and constraints
-- Description: Adds provider column and ensures unique model_id for system models.

-- 1. Add provider column if not exists
ALTER TABLE public.ai_model_settings 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gemini';

-- 2. Add partial unique index for system models (where user_id is NULL)
-- This allows ON CONFLICT (model_id) WHERE user_id IS NULL to work properly.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_settings_model_id_system 
ON public.ai_model_settings (model_id) 
WHERE user_id IS NULL;

-- 3. Update existing Gemini models to have the 'gemini' provider
UPDATE public.ai_model_settings 
SET provider = 'gemini' 
WHERE provider IS NULL OR provider = '';
