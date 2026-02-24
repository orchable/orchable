-- Migration: Add Asset Registry (Custom Components & Template Linkage)
-- Created: 2026-02-24

-- 1. Create the custom_components table
CREATE TABLE IF NOT EXISTS public.custom_components (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    description text NULL,
    code text NOT NULL,
    mock_data jsonb NULL DEFAULT '{}'::jsonb,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT custom_components_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Add RLS to custom_components
ALTER TABLE public.custom_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public or their own components" ON public.custom_components;
CREATE POLICY "Users can view public or their own components"
    ON public.custom_components FOR SELECT
    TO authenticated
    USING (is_public = true OR auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can create components" ON public.custom_components;
CREATE POLICY "Users can create components"
    ON public.custom_components FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own components" ON public.custom_components;
CREATE POLICY "Users can update their own components"
    ON public.custom_components FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own components" ON public.custom_components;
CREATE POLICY "Users can delete their own components"
    ON public.custom_components FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- 2. Update prompt_templates to support Registry Linkage
ALTER TABLE public.prompt_templates 
    ADD COLUMN IF NOT EXISTS view_config jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS custom_component_id uuid REFERENCES public.custom_components(id) ON DELETE SET NULL;

-- 3. Data Migration: Extract existing inline components into the registry
-- This logic creates a registry entry for every prompt_template that has inline custom_component code
DO $$
DECLARE
    template_row RECORD;
    new_comp_id UUID;
    has_view_config BOOLEAN;
BEGIN
    -- Only attempt migration if view_config exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='prompt_templates' AND column_name='view_config'
    ) INTO has_view_config;

    IF has_view_config THEN
        FOR template_row IN 
            SELECT id, name, (view_config->>'customComponent') as code, created_at, created_by 
            FROM public.prompt_templates 
            WHERE (view_config->>'customComponent') IS NOT NULL AND (view_config->>'customComponent') != ''
        LOOP
            -- Insert into custom_components
            INSERT INTO public.custom_components (name, description, code, created_at, created_by, is_public)
            VALUES (
                template_row.name || ' (Auto-migrated)',
                'Extracted from prompt template: ' || template_row.name,
                template_row.code,
                template_row.created_at,
                template_row.created_by,
                true -- Make initial migrated components public for visibility
            )
            RETURNING id INTO new_comp_id;

            -- Update the template to point to the new component
            UPDATE public.prompt_templates
            SET custom_component_id = new_comp_id
            WHERE id = template_row.id;
        END LOOP;
    END IF;
END $$;

-- 4. Enable triggers for updated_at
DROP TRIGGER IF EXISTS update_custom_components_updated_at ON public.custom_components;
CREATE TRIGGER update_custom_components_updated_at 
    BEFORE UPDATE ON public.custom_components 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
