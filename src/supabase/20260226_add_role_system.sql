-- Migration: Add Role System (Phase 1)
-- Date: 2026-02-26

-- 1. Create enum type for roles
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'superadmin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Clean up existing role data and convert column to enum
-- First update any values that don't match our new enum
UPDATE public.user_profiles 
SET role = 'user' 
WHERE role NOT IN ('user', 'admin', 'superadmin') OR role IS NULL;

-- Alter column to use the new enum type
ALTER TABLE public.user_profiles 
ALTER COLUMN role TYPE public.user_role 
USING role::public.user_role;

ALTER TABLE public.user_profiles 
ALTER COLUMN role SET DEFAULT 'user'::public.user_role;

-- 3. Add tier column to user_profiles for quick frontend access
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS tier varchar DEFAULT 'free';

-- 4. Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier                    VARCHAR NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    cancel_at_period_end    BOOLEAN DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin'::public.user_role, 'superadmin'::public.user_role)
    );
$$;

CREATE OR REPLACE FUNCTION public.get_my_tier()
RETURNS varchar
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT tier FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 6. Update/Create RLS Policies with Admin Bypass

-- user_profiles admin access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles 
FOR SELECT TO authenticated USING (public.is_admin());

-- orchestrator_executions admin bypass
DROP POLICY IF EXISTS "Admins view all executions" ON public.orchestrator_executions;
CREATE POLICY "Admins view all executions" ON public.orchestrator_executions 
FOR SELECT TO authenticated USING (public.is_admin());

-- ai_tasks admin bypass
DROP POLICY IF EXISTS "Admins view all tasks" ON public.ai_tasks;
CREATE POLICY "Admins view all tasks" ON public.ai_tasks 
FOR SELECT TO authenticated USING (public.is_admin());

-- task_batches admin bypass
DROP POLICY IF EXISTS "Admins view all batches" ON public.task_batches;
CREATE POLICY "Admins view all batches" ON public.task_batches 
FOR SELECT TO authenticated USING (public.is_admin());

-- workflow_jobs admin bypass
DROP POLICY IF EXISTS "Admins view all workflow jobs" ON public.workflow_jobs;
CREATE POLICY "Admins view all workflow jobs" ON public.workflow_jobs 
FOR SELECT TO authenticated USING (public.is_admin());

-- hub_assets: Allow all authenticated users to insert (not just premium)
DROP POLICY IF EXISTS "Authenticated users can create assets" ON public.hub_assets;
CREATE POLICY "Authenticated users can create assets" ON public.hub_assets 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

-- user_subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscription" 
ON public.user_subscriptions FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins view all subscriptions" 
ON public.user_subscriptions FOR SELECT TO authenticated 
USING (public.is_admin());

-- 7. Sync Trigger: user_subscriptions -> user_profiles
CREATE OR REPLACE FUNCTION public.handle_tier_sync()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles 
    SET tier = NEW.tier,
        updated_at = now()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_tier_to_profile ON public.user_subscriptions;
CREATE TRIGGER tr_sync_tier_to_profile
AFTER INSERT OR UPDATE OF tier ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_tier_sync();

-- 8. Backfill superadmin
-- We determine superadmin by email as requested
UPDATE public.user_profiles 
SET role = 'superadmin'::public.user_role 
WHERE email = 'makexyzfun@gmail.com';
