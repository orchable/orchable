-- Forcefully drop any residual permissive policies that might have been automatically created by Supabase.
DO $$ 
DECLARE 
    tbl VARCHAR;
    pol VARCHAR;
    policies_to_drop VARCHAR[] := ARRAY[
        'Enable read access for all users',
        'Enable insert access for all users',
        'Enable update access for all users',
        'Enable delete access for all users',
        'Enable read access for authenticated users',
        'Enable insert access for authenticated users',
        'Enable update access for authenticated users',
        'Enable delete access for authenticated users'
    ];
    target_tables VARCHAR[] := ARRAY[
        'task_batches',
        'ai_tasks',
        'prompt_templates',
        'custom_components',
        'lab_orchestrator_configs',
        'ai_model_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY target_tables
    LOOP
        FOREACH pol IN ARRAY policies_to_drop
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
        END LOOP;
    END LOOP;
END $$;
