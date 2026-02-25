-- Migration: Convert ai_tasks.status to ENUM (ULTRA ROBUST VERSION)
-- Description: Handles views, triggers, indexes, and casting for a smooth transition.

-- 1. DROP ALL IDENTIFIED DEPENDENCIES (WITH CASCADE)
DROP VIEW IF EXISTS public.v_runnable_tasks CASCADE;
DROP VIEW IF EXISTS public.v_stuck_tasks CASCADE;
DROP VIEW IF EXISTS public.v_failed_tasks_for_retry CASCADE;
DROP VIEW IF EXISTS public.v_processing_tasks CASCADE;
DROP VIEW IF EXISTS public.v_tasks_awaiting_approval CASCADE;
DROP VIEW IF EXISTS public.ai_tasks_with_template CASCADE;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_update_batch_counters ON public.ai_tasks;
DROP FUNCTION IF EXISTS public.update_task_batch_counters();

-- 2. DROP INDEXES THAT USE THE COLUMN
DROP INDEX IF EXISTS public.idx_ai_tasks_agent;
DROP INDEX IF EXISTS public.idx_ai_tasks_status;
DROP INDEX IF EXISTS public.idx_ai_tasks_batch_status;
DROP INDEX IF EXISTS public.idx_ai_tasks_agent_id_status; -- (potential variant)
DROP INDEX IF EXISTS public.idx_ai_tasks_agent_status; -- (potential variant)

-- 3. PREP COLUMN
-- Drop default and any existing check constraints
ALTER TABLE public.ai_tasks ALTER COLUMN status DROP DEFAULT;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_tasks_status_check') THEN
        ALTER TABLE public.ai_tasks DROP CONSTRAINT ai_tasks_status_check;
    END IF;
END $$;

-- 4. CREATE ENUM TYPE
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_task_status') THEN
        CREATE TYPE public.ai_task_status AS ENUM (
            'plan',
            'pending',
            'running',
            'processing',
            'awaiting_approval',
            'approved',
            'completed',
            'generated',
            'failed',
            'cancelled',
            'skipped'
        );
    END IF;
END $$;

-- 5. ALTER COLUMN TYPE
-- Use double-cast status::text::public.ai_task_status for maximum compatibility
-- Migration note: Map legacy 'pending' status to 'plan' during transition
ALTER TABLE public.ai_tasks 
  ALTER COLUMN status TYPE public.ai_task_status 
  USING (CASE WHEN status = 'pending' THEN 'plan' ELSE status END)::text::public.ai_task_status;

-- 6. SET NEW DEFAULT
ALTER TABLE public.ai_tasks 
  ALTER COLUMN status SET DEFAULT 'plan'::public.ai_task_status;

-- 7. RECREATE INDEXES (Updated with Enum-compatible predicates)
CREATE INDEX idx_ai_tasks_status ON public.ai_tasks USING btree (status);
CREATE INDEX idx_ai_tasks_batch_status ON public.ai_tasks USING btree (batch_id, status);

CREATE INDEX idx_ai_tasks_agent ON public.ai_tasks USING btree (agent_id, status)
WHERE (status = 'plan'::public.ai_task_status);

-- 8. RECREATE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_task_batch_counters()
RETURNS TRIGGER AS $$
DECLARE
    v_batch_id UUID;
    is_new_task BOOLEAN;
    old_state TEXT;
    new_state TEXT;
BEGIN
    v_batch_id := COALESCE(NEW.batch_id, OLD.batch_id);
    IF v_batch_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    is_new_task := (TG_OP = 'INSERT');
    
    -- Map Enum statuses to legacy Batch Counters
    old_state := CASE 
        WHEN OLD.status IS NULL THEN 'none'
        WHEN OLD.status::text IN ('plan', 'pending', 'awaiting_approval') THEN 'pending'
        WHEN OLD.status::text IN ('running', 'processing') THEN 'processing'
        WHEN OLD.status::text IN ('approved', 'completed', 'generated', 'skipped') THEN 'completed'
        WHEN OLD.status::text IN ('failed', 'cancelled') THEN 'failed'
        ELSE 'none'
    END;
    
    new_state := CASE 
        WHEN NEW.status::text IN ('plan', 'pending', 'awaiting_approval') THEN 'pending'
        WHEN NEW.status::text IN ('running', 'processing') THEN 'processing'
        WHEN NEW.status::text IN ('approved', 'completed', 'generated', 'skipped') THEN 'completed'
        WHEN NEW.status::text IN ('failed', 'cancelled') THEN 'failed'
        ELSE 'none'
    END;
    
    IF is_new_task THEN
        UPDATE public.task_batches 
        SET total_tasks = total_tasks + 1,
            status = CASE WHEN status = 'completed' THEN 'processing'::character varying ELSE status END,
            completed_at = CASE WHEN status = 'completed' THEN NULL ELSE completed_at END,
            updated_at = now()
        WHERE id = v_batch_id;
        
        IF new_state = 'pending' THEN
            UPDATE public.task_batches SET pending_tasks = pending_tasks + 1, updated_at = now() WHERE id = v_batch_id;
        ELSIF new_state = 'processing' THEN
            UPDATE public.task_batches SET processing_tasks = processing_tasks + 1, started_at = COALESCE(started_at, now()), status = 'processing', updated_at = now() WHERE id = v_batch_id;
        ELSIF new_state = 'completed' THEN
            UPDATE public.task_batches SET completed_tasks = completed_tasks + 1, updated_at = now() WHERE id = v_batch_id;
        ELSIF new_state = 'failed' THEN
            UPDATE public.task_batches SET failed_tasks = failed_tasks + 1, updated_at = now() WHERE id = v_batch_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    IF old_state = new_state THEN
        RETURN NEW;
    END IF;
    
    -- Decrement old status counter
    IF old_state = 'pending' THEN
        UPDATE public.task_batches SET pending_tasks = GREATEST(0, pending_tasks - 1), updated_at = now() WHERE id = v_batch_id;
    ELSIF old_state = 'processing' THEN
        UPDATE public.task_batches SET processing_tasks = GREATEST(0, processing_tasks - 1), updated_at = now() WHERE id = v_batch_id;
    ELSIF old_state = 'completed' THEN
        UPDATE public.task_batches SET completed_tasks = GREATEST(0, completed_tasks - 1), updated_at = now() WHERE id = v_batch_id;
    ELSIF old_state = 'failed' THEN
        UPDATE public.task_batches SET failed_tasks = failed_tasks - 1, updated_at = now() WHERE id = v_batch_id;
    END IF;
    
    -- Increment new status counter
    IF new_state = 'pending' THEN
        UPDATE public.task_batches SET pending_tasks = pending_tasks + 1, updated_at = now() WHERE id = v_batch_id;
    ELSIF new_state = 'processing' THEN
        UPDATE public.task_batches SET processing_tasks = processing_tasks + 1, started_at = COALESCE(started_at, now()), status = 'processing', updated_at = now() WHERE id = v_batch_id;
    ELSIF new_state = 'completed' THEN
        UPDATE public.task_batches SET completed_tasks = completed_tasks + 1, updated_at = now() WHERE id = v_batch_id;
    ELSIF new_state = 'failed' THEN
        UPDATE public.task_batches SET failed_tasks = failed_tasks + 1, updated_at = now() WHERE id = v_batch_id;
    END IF;
    
    UPDATE public.task_batches SET
        status = CASE
            WHEN completed_tasks + failed_tasks >= total_tasks THEN 'completed'::character varying
            ELSE status
        END,
        completed_at = CASE
            WHEN completed_tasks + failed_tasks >= total_tasks THEN now()
            ELSE completed_at
        END
    WHERE id = v_batch_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. RECREATE TRIGGER
CREATE TRIGGER trigger_update_batch_counters
    AFTER INSERT OR UPDATE OF status ON public.ai_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_task_batch_counters();

-- 10. RECREATE VIEWS

-- v_runnable_tasks
CREATE OR REPLACE VIEW public.v_runnable_tasks AS
SELECT
  t.id,
  COALESCE(
    t.task_type,
    (pt.stage_config ->> 'type'::text)::character varying
  ) AS task_type,
  t.status,
  t.input_data,
  pt.default_ai_settings ->> 'model_id'::text AS model_id,
  (
    (
      pt.default_ai_settings -> 'generationConfig'::text
    ) ->> 'temperature'::text
  )::numeric AS temperature,
  pt.default_ai_settings AS ai_settings,
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
  pt.next_stage_template_ids[1] AS next_stage_template_id,
  t.created_at,
  t.extra,
  t.split_group_id,
  t.user_id,
  b.status AS batch_status,
  b.name AS batch_name
FROM
  public.ai_tasks t
  LEFT JOIN public.prompt_templates pt ON t.prompt_template_id = pt.id
  LEFT JOIN public.ai_tasks parent ON t.parent_task_id = parent.id
  LEFT JOIN public.task_batches b ON t.batch_id = b.id
WHERE
  t.status::text = 'plan'::text
  AND (
    t.parent_task_id IS NULL
    OR (
      parent.status::text = ANY (
        ARRAY[
          'completed'::text,
          'generated'::text,
          'approved'::text
        ]
      )
    )
  )
ORDER BY
  t.status::text = 'plan'::text DESC,
  t.test_mode DESC,
  t.batch_priority,
  t.step_number,
  t.sequence;

-- v_stuck_tasks (User provided definition)
CREATE OR REPLACE VIEW public.v_stuck_tasks AS
SELECT
  at.id AS task_id,
  at.batch_id,
  tb.name AS batch_name,
  tb.grade_code,
  at.lo_code,
  at.task_type,
  at.phase_code,
  at.error_message,
  at.retry_count,
  at.created_at,
  at.completed_at AS failed_at
FROM
  public.ai_tasks at
  LEFT JOIN public.task_batches tb ON tb.id = at.batch_id
WHERE
  at.status::text = 'failed'::text
  AND at.retry_count >= 3
ORDER BY
  at.completed_at DESC;

-- v_failed_tasks_for_retry (Actual definition provided by user)
CREATE OR REPLACE VIEW public.v_failed_tasks_for_retry AS
SELECT
  at.id AS task_id,
  at.batch_id,
  tb.name AS batch_name,
  tb.grade_code,
  at.lo_code,
  at.task_type,
  at.error_message,
  at.retry_count,
  at.created_at,
  at.completed_at AS failed_at
FROM
  public.ai_tasks at
  JOIN public.task_batches tb ON tb.id = at.batch_id
WHERE
  at.status::text = 'failed'::text
  AND at.retry_count < 3
ORDER BY
  at.completed_at DESC;

-- v_tasks_awaiting_approval
CREATE OR REPLACE VIEW public.v_tasks_awaiting_approval AS
SELECT
  t.id,
  t.status,
  t.input_data,
  t.output_data,
  t.requires_approval,
  t.approved_at,
  t.approved_by,
  t.edit_notes,
  t.edited_output_data,
  t.prompt_template_id,
  t.batch_id,
  t.stage_key,
  t.sequence,
  t.total_steps,
  t.created_at,
  t.completed_at,
  b.name AS batch_name,
  b.grade_code,
  b.preset_key,
  pt.template AS prompt,
  pt.default_ai_settings AS ai_settings
FROM
  public.ai_tasks t
  LEFT JOIN public.task_batches b ON t.batch_id = b.id
  LEFT JOIN public.prompt_templates pt ON t.prompt_template_id = pt.id
WHERE
  t.status::text = 'awaiting_approval'::text;

-- ai_tasks_with_template
CREATE OR REPLACE VIEW public.ai_tasks_with_template AS
SELECT
  t.*,
  pt.template AS prompt_text,
  pt.stage_config,
  pt.default_ai_settings,
  pt.next_stage_template_ids
FROM
  public.ai_tasks t
  LEFT JOIN public.prompt_templates pt ON t.prompt_template_id = pt.id;

-- v_processing_tasks
CREATE OR REPLACE VIEW public.v_processing_tasks AS
SELECT
  at.id AS task_id,
  at.batch_id,
  tb.name AS batch_name,
  tb.grade_code,
  at.lo_code,
  at.task_type,
  at.n8n_execution_id,
  at.started_at,
  EXTRACT(EPOCH FROM (now() - at.started_at))::integer AS running_seconds
FROM
  public.ai_tasks at
  LEFT JOIN public.task_batches tb ON tb.id = at.batch_id
WHERE
  at.status::text = 'processing'::text
ORDER BY
  at.started_at DESC;
