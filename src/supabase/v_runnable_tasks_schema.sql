create view public.v_runnable_tasks as
select
  t.id,
  COALESCE(
    t.task_type,
    (pt.stage_config ->> 'type'::text)::character varying
  ) as task_type,
  t.status,
  t.input_data,
  pt.default_ai_settings ->> 'model_id'::text as model_id,
  (
    (
      pt.default_ai_settings -> 'generationConfig'::text
    ) ->> 'temperature'::text
  )::numeric as temperature,
  pt.default_ai_settings as ai_settings,
  t.agent_id,
  t.batch_priority,
  t.test_mode,
  t.batch_id,
  t.launch_id,
  t.lo_code,
  t.sequence,
  t.phase_code,
  t.retry_count,
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
  pt.next_stage_template_ids[1] as next_stage_template_id,
  t.created_at,
  t.extra,
  t.split_group_id,
  t.user_id,
  b.status as batch_status,
  b.name as batch_name
from
  ai_tasks t
  left join prompt_templates pt on t.prompt_template_id = pt.id
  left join ai_tasks parent on t.parent_task_id = parent.id
  left join task_batches b on t.batch_id = b.id
where
  t.status::text = 'pending'::text
  and (
    t.parent_task_id is null
    or (
      parent.status::text = any (
        array[
          'completed'::character varying::text,
          'approved'::character varying::text
        ]
      )
    )
  )
order by
  t.test_mode desc,
  t.batch_priority,
  t.step_number,
  t.sequence;