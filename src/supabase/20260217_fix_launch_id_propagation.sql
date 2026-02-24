-- Migration: Fix create_next_stage_tasks to propagate launch_id to child tasks
-- + Backfill existing orphan tasks
-- Created: 2026-02-17

-- 1. Update create_next_stage_tasks to include launch_id
DROP FUNCTION IF EXISTS create_next_stage_tasks(UUID, JSONB);
DROP FUNCTION IF EXISTS create_next_stage_tasks(UUID, TEXT);

CREATE OR REPLACE FUNCTION create_next_stage_tasks(
  p_parent_task_id UUID,
  p_tasks TEXT
) RETURNS TABLE(task_id UUID, sequence INTEGER) AS $$
DECLARE
  v_task JSONB;
  v_new_id UUID;
  v_parent_path UUID[];
  v_root_id UUID;
  v_stage_key TEXT;
  v_parent_launch_id UUID;  -- NEW: parent's launch_id
  v_tasks_jsonb JSONB;
BEGIN
  v_tasks_jsonb := p_tasks::jsonb;

  -- Get parent task info for hierarchy calculation + launch_id
  SELECT 
    hierarchy_path, 
    COALESCE(root_task_id, id),
    stage_key,
    launch_id  -- NEW: fetch parent's launch_id
  INTO v_parent_path, v_root_id, v_stage_key, v_parent_launch_id
  FROM ai_tasks 
  WHERE id = p_parent_task_id;

  IF v_parent_path IS NULL THEN
    v_parent_path := ARRAY[]::UUID[];
  END IF;
  
  IF v_root_id IS NULL THEN
    v_root_id := p_parent_task_id;
  END IF;

  FOR v_task IN SELECT * FROM jsonb_array_elements(v_tasks_jsonb)
  LOOP
    v_stage_key := COALESCE(
      v_task->>'stage_key',
      regexp_replace(
        v_task->>'prompt_template_id', 
        '^[a-f0-9-]+_(.+)$', 
        '\1'
      )
    );

    INSERT INTO ai_tasks (
      id,
      prompt_template_id,
      input_data,
      parent_task_id,
      batch_id,
      launch_id,  -- NEW: include launch_id
      test_mode,
      sequence,
      status,
      task_type,
      total_steps,
      stage_key,
      step_number,
      root_task_id,
      hierarchy_path,
      extra,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_task->>'prompt_template_id',
      v_task->'input_data',
      p_parent_task_id,
      NULLIF(v_task->>'batch_id', '')::uuid,
      -- NEW: Use task's launch_id if provided, otherwise inherit from parent
      COALESCE(NULLIF(v_task->>'launch_id', '')::uuid, v_parent_launch_id),
      COALESCE((v_task->>'test_mode')::boolean, false),
      COALESCE((v_task->>'sequence')::integer, 1),
      COALESCE(v_task->>'status', 'pending'),
      COALESCE(v_task->>'task_type', 'child_task'),
      COALESCE((v_task->>'total_steps')::integer, 1),
      v_stage_key,
      COALESCE((v_task->>'step_number')::integer, 1),
      v_root_id,
      v_parent_path || p_parent_task_id,
      COALESCE(v_task->'extra', '{}'::jsonb),
      NOW()
    )
    RETURNING ai_tasks.id INTO v_new_id;
    
    RETURN QUERY SELECT v_new_id, COALESCE((v_task->>'sequence')::integer, 1);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_next_stage_tasks(UUID, TEXT) IS 
'Creates child tasks from N8N workflow. Propagates launch_id from parent task to enable Monitor visibility for all pipeline stages.';

-- 2. Backfill existing orphan tasks (step 2+) that are missing launch_id
UPDATE ai_tasks child
SET launch_id = parent.launch_id
FROM ai_tasks parent
WHERE child.parent_task_id = parent.id
  AND child.launch_id IS NULL
  AND parent.launch_id IS NOT NULL;

-- 3. Update v_runnable_tasks view to include launch_id (required for n8n to propagate it)
DROP VIEW IF EXISTS public.v_runnable_tasks;
CREATE VIEW public.v_runnable_tasks AS
SELECT
  t.id,
  COALESCE(
    t.task_type,
    (pt.stage_config ->> 'type'::text)::character varying
  ) AS task_type,
  t.status,
  pt.template AS prompt,
  t.input_data,
  pt.default_ai_settings ->> 'model_id'::text AS model_id,
  (
    (pt.default_ai_settings -> 'generationConfig'::text) ->> 'temperature'::text
  )::numeric AS temperature,
  pt.default_ai_settings AS ai_settings,
  t.agent_id,
  t.batch_priority,
  t.test_mode,
  t.batch_id,
  t.launch_id,  -- NEW: needed for child task propagation
  t.lo_code,
  t.sequence,
  t.phase_code,
  t.retry_count,  -- NEW: needed for n8n retry logic
  t.step_id,
  t.parent_task_id,
  t.root_task_id,
  t.hierarchy_path,
  t.stage_key,
  t.step_number,
  t.total_steps,
  t.next_task_config,
  t.orchestrator_execution_id,
  t.step_execution_id,
  t.requires_approval,
  t.prompt_template_id,
  pt.next_stage_template_ids,
  pt.next_stage_template_ids[1] AS next_stage_template_id,
  t.created_at,
  t.extra,
  t.split_group_id,
  t.user_id
FROM
  ai_tasks t
  LEFT JOIN prompt_templates pt ON t.prompt_template_id = pt.id
  LEFT JOIN ai_tasks parent ON t.parent_task_id = parent.id
WHERE
  t.status::text = 'pending'::text
  AND (
    t.parent_task_id IS NULL
    OR (
      parent.status::text = ANY (
        ARRAY[
          'completed'::character varying,
          'approved'::character varying
        ]::text[]
      )
    )
  )
ORDER BY
  t.test_mode DESC,
  t.batch_priority,
  t.step_number,
  t.sequence;
