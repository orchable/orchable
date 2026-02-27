-- Migration: Fix RLS policies for lab_orchestrator_configs
-- Date: 2026-02-27
-- Problem: Legacy configs with created_by = NULL can be viewed but not updated

-- 1. Fix UPDATE and DELETE policies to allow modifying legacy (NULL created_by) configs
DROP POLICY IF EXISTS "Users can update own configs" ON public.lab_orchestrator_configs;
CREATE POLICY "Users can update own configs"
    ON public.lab_orchestrator_configs FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS "Users can delete own configs" ON public.lab_orchestrator_configs;
CREATE POLICY "Users can delete own configs"
    ON public.lab_orchestrator_configs FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by OR created_by IS NULL);

-- 2. Backfill: Claim all NULL created_by configs for the current superadmin user
-- (Run this ONCE after migration to assign ownership)
-- Replace the UUID below with the actual user ID if needed
UPDATE public.lab_orchestrator_configs 
SET created_by = '4ecc3a2e-75fe-45da-b007-9a5075faa0fd'
WHERE created_by IS NULL;
