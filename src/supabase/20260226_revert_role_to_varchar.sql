-- URGENT FIX: Revert user_profiles.role from user_role enum back to varchar
-- Root cause: The user_role enum causes COALESCE type mismatches in multiple
-- database functions/triggers during the OAuth login flow.
-- The enum adds complexity without real benefit — a CHECK constraint is safer.

-- Step 1: Drop dependent functions that return user_role type
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;

-- Step 2: Convert column back to varchar
ALTER TABLE public.user_profiles 
ALTER COLUMN role TYPE varchar 
USING role::text;

ALTER TABLE public.user_profiles 
ALTER COLUMN role SET DEFAULT 'user';

-- Step 3: Add CHECK constraint instead of enum
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('user', 'admin', 'superadmin'));

-- Step 4: Recreate helper functions with varchar instead of enum
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS varchar
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
    RETURN (SELECT role FROM public.user_profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    );
END;
$$;

-- Step 5: Fix handle_new_user to use plain text (no enum cast needed)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role, avatar_url, created_at, updated_at, settings)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        'user',
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        now(),
        now(),
        '{}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.user_profiles.full_name),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.user_profiles.avatar_url),
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Ensure trigger still exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 7: (Optional) Drop the enum type if no longer used
-- Only run this after confirming no other object depends on it
-- DROP TYPE IF EXISTS public.user_role;
