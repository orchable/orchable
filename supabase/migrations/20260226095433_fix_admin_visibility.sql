-- Re-add admin visibility to user_profiles
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

-- Add admin visibility to lab_orchestrator_configs
DROP POLICY IF EXISTS "Users can view own or public configs" ON public.lab_orchestrator_configs;
CREATE POLICY "Users can view own or public configs" 
ON public.lab_orchestrator_configs 
FOR SELECT 
TO authenticated 
USING (
    (auth.uid() = created_by) OR 
    (is_public = true) OR 
    (created_by IS NULL) OR 
    public.is_admin()
);

-- Add admin visibility to task_batches
DROP POLICY IF EXISTS "Users can view their own batches or public batches" ON public.task_batches;
CREATE POLICY "Users can view their own batches or public batches" 
ON public.task_batches 
FOR SELECT 
TO authenticated 
USING (
    (auth.uid() = created_by) OR 
    (is_public = true) OR 
    public.is_admin()
);

-- Add admin visibility to ai_tasks
DROP POLICY IF EXISTS "Users can view their own tasks or tasks in public batches" ON public.ai_tasks;
CREATE POLICY "Users can view their own tasks or tasks in public batches" 
ON public.ai_tasks 
FOR SELECT 
TO authenticated 
USING (
    (auth.uid() = user_id) OR 
    (EXISTS (
        SELECT 1 FROM public.task_batches b 
        WHERE b.id = ai_tasks.batch_id AND (b.is_public = true OR public.is_admin())
    )) OR 
    public.is_admin()
);
