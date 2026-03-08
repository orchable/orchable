-- Grant Admins permission to UPDATE and DELETE configurations
DROP POLICY IF EXISTS "Users can update own configs" ON public.lab_orchestrator_configs;
CREATE POLICY "Users can update own or admins can manage all configs" 
ON public.lab_orchestrator_configs 
FOR UPDATE 
TO authenticated 
USING (
    (auth.uid() = created_by) OR 
    public.is_admin()
);

DROP POLICY IF EXISTS "Users can delete own configs" ON public.lab_orchestrator_configs;
CREATE POLICY "Users can delete own or admins can manage all configs" 
ON public.lab_orchestrator_configs 
FOR DELETE 
TO authenticated 
USING (
    (auth.uid() = created_by) OR 
    public.is_admin()
);

-- Grant Admins permission to UPDATE and DELETE prompt templates
DROP POLICY IF EXISTS "Users can update own templates" ON public.prompt_templates;
CREATE POLICY "Users can update own or admins can manage all templates" 
ON public.prompt_templates 
FOR UPDATE 
TO authenticated 
USING (
    (auth.uid() = created_by) OR 
    public.is_admin()
);

DROP POLICY IF EXISTS "Users can delete own templates" ON public.prompt_templates;
CREATE POLICY "Users can delete own or admins can manage all templates" 
ON public.prompt_templates 
FOR DELETE 
TO authenticated 
USING (
    (auth.uid() = created_by) OR 
    public.is_admin()
);
