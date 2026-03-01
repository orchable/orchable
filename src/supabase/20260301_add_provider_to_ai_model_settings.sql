-- Migration: Add provider column to ai_model_settings
-- Description: Adds a provider column to identify model vendors (e.g., gemini, deepseek).

ALTER TABLE public.ai_model_settings 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gemini';

-- Update existing Gemini models to have the 'gemini' provider
UPDATE public.ai_model_settings SET provider = 'gemini' WHERE provider IS NULL OR provider = '';
