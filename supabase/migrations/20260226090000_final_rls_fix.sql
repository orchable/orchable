-- URGENT: Fix infinite recursion on user_profiles
-- 1. Drop the recursive policy if it exists
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- 2. Ensure is_admin is SECURITY DEFINER and using plpgsql to avoid inlining recursion
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'superadmin')
    FROM public.user_profiles
    WHERE id = auth.uid()
  );
END;
$function$;
