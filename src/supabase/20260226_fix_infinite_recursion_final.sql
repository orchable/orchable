-- URGENT FIX: Remove recursive policy on user_profiles
-- Calling is_admin() inside user_profiles RLS policy causes infinite recursion
-- because is_admin() queries user_profiles, triggering the policy again.

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- Instead, if admins need to view profiles, they should use a SECURITY DEFINER 
-- RPC or we can rely on the JWT role for admin checks if strictly needed.
-- For now, removing the policy solves the exact infinite spinner crash upon reload.
