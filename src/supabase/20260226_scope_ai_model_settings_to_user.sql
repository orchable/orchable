-- Migration: Scope ai_model_settings to individual users
-- Created: 2026-02-26
-- Purpose: Each user gets their own copy of AI model settings

-- 1. Add user_id column (nullable for legacy global defaults)
ALTER TABLE public.ai_model_settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop the global unique constraint on model_id (it now needs to be unique per user)
ALTER TABLE public.ai_model_settings DROP CONSTRAINT IF EXISTS ai_model_settings_model_id_key;

-- 3. Add a composite unique constraint (user_id + model_id)
-- NULL user_id rows serve as global defaults
ALTER TABLE public.ai_model_settings ADD CONSTRAINT ai_model_settings_user_model_unique UNIQUE (user_id, model_id);

-- 4. Drop old overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ai_model_settings;
DROP POLICY IF EXISTS "Enable modify access for authenticated users" ON public.ai_model_settings;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.ai_model_settings;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.ai_model_settings;

-- 5. Create user-scoped policies
-- Users can read their own settings + global defaults (user_id IS NULL)
CREATE POLICY "Users can view own settings or global defaults"
    ON public.ai_model_settings FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can only insert their own settings
CREATE POLICY "Users can create own settings"
    ON public.ai_model_settings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own settings
CREATE POLICY "Users can update own settings"
    ON public.ai_model_settings FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can only delete their own settings
CREATE POLICY "Users can delete own settings"
    ON public.ai_model_settings FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
