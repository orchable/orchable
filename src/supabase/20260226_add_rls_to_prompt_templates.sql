-- Migration: Add RLS to prompt_templates
-- Created: 2026-02-26
-- Purpose: Enforce user isolation on prompt templates

-- 1. Add is_public column
ALTER TABLE public.prompt_templates ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 2. Enable RLS
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- 3. Drop any existing permissive policies (safety)
DROP POLICY IF EXISTS "Users can view own or public templates" ON public.prompt_templates;
DROP POLICY IF EXISTS "Users can create templates" ON public.prompt_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.prompt_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.prompt_templates;

-- 4. Create restrictive policies
CREATE POLICY "Users can view own or public templates"
    ON public.prompt_templates FOR SELECT
    TO authenticated
    USING (auth.uid() = created_by OR is_public = true OR created_by IS NULL);

CREATE POLICY "Users can create templates"
    ON public.prompt_templates FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates"
    ON public.prompt_templates FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates"
    ON public.prompt_templates FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- 5. Backfill: mark existing legacy templates (created_by IS NULL) as public
UPDATE public.prompt_templates SET is_public = true WHERE created_by IS NULL;
