-- Migration: Add RLS to lab_orchestrator_configs
-- Created: 2026-02-26
-- Purpose: Enforce user isolation on orchestrator configs (Designer)

-- 1. Change created_by from VARCHAR to UUID for proper auth.uid() comparison
-- First, clear out non-UUID values and cast
UPDATE public.lab_orchestrator_configs
SET created_by = NULL
WHERE created_by IS NOT NULL
  AND created_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

ALTER TABLE public.lab_orchestrator_configs
    ALTER COLUMN created_by TYPE uuid USING created_by::uuid;

-- 2. Add foreign key constraint
ALTER TABLE public.lab_orchestrator_configs
    ADD CONSTRAINT lab_orchestrator_configs_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add is_public column
ALTER TABLE public.lab_orchestrator_configs ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 4. Enable RLS
ALTER TABLE public.lab_orchestrator_configs ENABLE ROW LEVEL SECURITY;

-- 5. Create policies
DROP POLICY IF EXISTS "Users can view own or public configs" ON public.lab_orchestrator_configs;
DROP POLICY IF EXISTS "Users can create configs" ON public.lab_orchestrator_configs;
DROP POLICY IF EXISTS "Users can update own configs" ON public.lab_orchestrator_configs;
DROP POLICY IF EXISTS "Users can delete own configs" ON public.lab_orchestrator_configs;

CREATE POLICY "Users can view own or public configs"
    ON public.lab_orchestrator_configs FOR SELECT
    TO authenticated
    USING (auth.uid() = created_by OR is_public = true OR created_by IS NULL);

CREATE POLICY "Users can create configs"
    ON public.lab_orchestrator_configs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own configs"
    ON public.lab_orchestrator_configs FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own configs"
    ON public.lab_orchestrator_configs FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- 6. Backfill: mark existing legacy configs (created_by IS NULL) as public
UPDATE public.lab_orchestrator_configs SET is_public = true WHERE created_by IS NULL;
