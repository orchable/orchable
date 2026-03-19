-- Migration: Fix RLS policies for prompt_templates to match lab_orchestrator_configs
-- Date: 2026-03-19
-- Problem: Users get 42501 when saving sample configs because they can update the config (created_by IS NULL) but the prompt_templates update policy strictly requires auth.uid() = created_by.

-- 1. Fix UPDATE and DELETE policies to allow modifying legacy (NULL created_by) templates
DROP POLICY IF EXISTS "Users can update own templates" ON public.prompt_templates;
CREATE POLICY "Users can update own templates"
    ON public.prompt_templates FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS "Users can delete own templates" ON public.prompt_templates;
CREATE POLICY "Users can delete own templates"
    ON public.prompt_templates FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by OR created_by IS NULL);
