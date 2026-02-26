-- Consolidation: Merge handle_new_user and sync_user_profile_from_auth
-- This migration unifies the two redundant auth triggers into one robust function.

-- 1. Create the unified consolidation function
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_username text;
    v_full_name text;
    v_avatar_url text;
    v_role text;
BEGIN
    -- Extract values from metadata
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
    v_avatar_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '');
    v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
    v_role := COALESCE(NEW.raw_app_meta_data->>'user_role', 'user');

    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        username,
        avatar_url, 
        role, 
        created_at, 
        updated_at, 
        settings
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_username,
        v_avatar_url,
        v_role,
        NEW.created_at,
        NEW.updated_at,
        '{}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name 
            ELSE public.user_profiles.full_name 
        END,
        username = COALESCE(EXCLUDED.username, public.user_profiles.username),
        avatar_url = CASE 
            WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url 
            ELSE public.user_profiles.avatar_url 
        END,
        -- Force sync role if present in app_metadata, otherwise keep current
        role = COALESCE(NULLIF(NEW.raw_app_meta_data->>'user_role', ''), public.user_profiles.role),
        updated_at = NEW.updated_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean up old triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
DROP TRIGGER IF EXISTS tr_sync_user_profile ON auth.users; -- Potential name of the second trigger
DROP TRIGGER IF EXISTS sync_user_profile_trigger ON auth.users; -- Another potential name

-- You mentioned sync_user_profile_from_auth has a trigger, let's try to drop it if we knew the name.
-- Since we don't know the trigger name for sure, a manual drop might be needed if it's named differently.
-- But we can definitely drop the functions.

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_profile_from_auth() CASCADE;

-- 3. Create the new unified trigger
CREATE TRIGGER on_auth_user_sync
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

-- NOTE: If you have an existing trigger named on_auth_user_created or similar pointing 
-- to the old functions, it's safer to drop them first. 
-- In the Supabase Dashboard, check Database -> Triggers for any other triggers 
-- on the auth.users table and disable/drop them to avoid double sync.
