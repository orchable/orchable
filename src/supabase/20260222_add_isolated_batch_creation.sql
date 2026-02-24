-- Migration: support isolated batch creation in create_next_stage_tasks
-- Created: 2026-02-22

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
  v_parent_launch_id UUID;
  v_tasks_jsonb JSONB;
  v_new_batch_id UUID := NULL;
  v_orchestrator_config_id UUID;
  v_created_by UUID;
  v_parent_batch_name TEXT;
BEGIN
  v_tasks_jsonb := p_tasks::jsonb;

  -- 1. Get parent info
  SELECT 
    hierarchy_path, 
    COALESCE(root_task_id, id),
    stage_key,
    launch_id,
    user_id
  INTO v_parent_path, v_root_id, v_stage_key, v_parent_launch_id, v_created_by
  FROM ai_tasks 
  WHERE id = p_parent_task_id;

  -- 2. Try to find orchestrator_config_id from the launch or batch
  SELECT orchestrator_config_id INTO v_orchestrator_config_id
  FROM task_batches
  WHERE launch_id = v_parent_launch_id
  LIMIT 1;

  IF v_parent_path IS NULL THEN v_parent_path := ARRAY[]::UUID[]; END IF;
  IF v_root_id IS NULL THEN v_root_id := p_parent_task_id; END IF;

  FOR v_task IN SELECT * FROM jsonb_array_elements(v_tasks_jsonb)
  LOOP
    v_stage_key := COALESCE(
      v_task->>'stage_key',
      regexp_replace(v_task->>'prompt_template_id', '^[a-f0-9-]+_(.+)$', '\1')
    );

    -- 3. Isolated Batch Logic: If batch_id is null/empty string, create a new batch for this specific split operation
    IF (v_task->>'batch_id' IS NULL OR v_task->>'batch_id' = '') AND v_new_batch_id IS NULL THEN
        INSERT INTO task_batches (
            name,
            status,
            batch_type,
            orchestrator_config_id,
            launch_id,
            created_by,
            preset_key,
            grade_code,
            total_tasks,
            pending_tasks
        ) VALUES (
            'Isolated Batch - ' || v_stage_key || ' - ' || substr(v_parent_launch_id::text, 1, 8),
            'processing',
            'auto_split',
            v_orchestrator_config_id,
            v_parent_launch_id,
            v_created_by,
            'auto',
            'none',
            0, -- Trigger will increment total_tasks via update_task_batch_counters
            0
        )
        RETURNING id INTO v_new_batch_id;
    END IF;

    INSERT INTO ai_tasks (
      id, prompt_template_id, input_data, parent_task_id, batch_id,
      launch_id,
      test_mode, sequence, status, task_type, total_steps, stage_key,
      step_number, root_task_id, hierarchy_path, extra, created_at, user_id
    ) VALUES (
      gen_random_uuid(),
      v_task->>'prompt_template_id',
      v_task->'input_data',
      p_parent_task_id,
      COALESCE(NULLIF(v_task->>'batch_id', '')::uuid, v_new_batch_id),
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
      NOW(),
      v_created_by
    )
    RETURNING ai_tasks.id INTO v_new_id;
    RETURN QUERY SELECT v_new_id, COALESCE((v_task->>'sequence')::integer, 1);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
