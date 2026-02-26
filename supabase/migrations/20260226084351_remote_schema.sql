


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."ai_task_status" AS ENUM (
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


ALTER TYPE "public"."ai_task_status" OWNER TO "postgres";


CREATE TYPE "public"."api_key_pool_type" AS ENUM (
    'personal',
    'free_pool',
    'premium_pool'
);


ALTER TYPE "public"."api_key_pool_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'admin',
    'superadmin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_task"("p_task_id" "uuid", "p_user_id" "uuid", "p_edited_output" "jsonb" DEFAULT NULL::"jsonb", "p_edit_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_next_task_id UUID;
BEGIN
  -- Update task with approval
  UPDATE ai_tasks SET
    status = 'approved',
    approved_at = NOW(),
    approved_by = p_user_id,
    edited_output_data = COALESCE(p_edited_output, edited_output_data),
    edit_notes = COALESCE(p_edit_notes, edit_notes)
  WHERE id = p_task_id;
  
  -- Create next task in chain
  SELECT create_next_task_in_chain(p_task_id) INTO v_next_task_id;
  
  RETURN v_next_task_id;
END;
$$;


ALTER FUNCTION "public"."approve_task"("p_task_id" "uuid", "p_user_id" "uuid", "p_edited_output" "jsonb", "p_edit_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."approve_task"("p_task_id" "uuid", "p_user_id" "uuid", "p_edited_output" "jsonb", "p_edit_notes" "text") IS 'Approves a task (optionally with edits) and creates the next task in chain.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_type" character varying(50) NOT NULL,
    "status" "public"."ai_task_status" DEFAULT 'plan'::"public"."ai_task_status" NOT NULL,
    "input_data" "jsonb" DEFAULT '{}'::"jsonb",
    "output_data" "jsonb",
    "error_message" "text",
    "user_id" "uuid",
    "n8n_execution_id" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "orchestrator_tracking" "jsonb",
    "agent_id" character varying(20) DEFAULT 'agent_1'::character varying,
    "batch_priority" timestamp with time zone,
    "test_mode" boolean DEFAULT false,
    "batch_id" "uuid",
    "lo_code" character varying(100),
    "sequence" integer,
    "phase_code" character varying(50),
    "retry_count" integer DEFAULT 0,
    "step_id" "uuid",
    "parent_task_id" "uuid",
    "step_number" integer DEFAULT 1,
    "total_steps" integer,
    "next_task_config" "jsonb",
    "orchestrator_execution_id" "uuid",
    "step_execution_id" "uuid",
    "requires_approval" boolean DEFAULT false,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "edited_output_data" "jsonb",
    "edit_notes" "text",
    "prompt_template_id" "text",
    "root_task_id" "uuid",
    "hierarchy_path" "jsonb" DEFAULT '[]'::"jsonb",
    "stage_key" character varying(50),
    "extra" "jsonb" DEFAULT '{}'::"jsonb",
    "split_group_id" "uuid",
    "launch_id" "uuid"
);


ALTER TABLE "public"."ai_tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_tasks" IS 'AI task queue for Hybrid POC. Frontend writes directly, n8n processes and callbacks.';



COMMENT ON COLUMN "public"."ai_tasks"."agent_id" IS 'Target agent for processing: agent_1, agent_2, agent_3';



COMMENT ON COLUMN "public"."ai_tasks"."batch_priority" IS 'Timestamp when batch was created (FIFO ordering)';



COMMENT ON COLUMN "public"."ai_tasks"."test_mode" IS 'If true, this task has highest priority';



COMMENT ON COLUMN "public"."ai_tasks"."batch_id" IS 'UUID grouping tasks from same batch';



COMMENT ON COLUMN "public"."ai_tasks"."sequence" IS 'Order within same agent in a batch (1, 2, 3...)';



CREATE OR REPLACE FUNCTION "public"."claim_runnable_tasks"("batch_limit" integer DEFAULT 20, "max_processing" integer DEFAULT 10) RETURNS SETOF "public"."ai_tasks"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current_processing INT;
  v_slots_available INT;
BEGIN
  -- Check current processing count
  SELECT COUNT(*) INTO v_current_processing
  FROM ai_tasks 
  WHERE status = 'processing';
  
  -- Calculate available slots
  v_slots_available := GREATEST(0, max_processing - v_current_processing);
  
  -- If no slots available, return empty
  IF v_slots_available = 0 THEN
    RETURN;
  END IF;
  
  -- Claim tasks up to available slots (respecting batch_limit)
  RETURN QUERY
  WITH claimed AS (
    UPDATE ai_tasks
    SET 
      status = 'processing', 
      started_at = NOW()
    WHERE id IN (
      SELECT t.id 
      FROM ai_tasks t
      LEFT JOIN ai_tasks parent ON t.parent_task_id = parent.id
      WHERE t.status = 'pending'
        AND (
          t.parent_task_id IS NULL 
          OR parent.status IN ('completed', 'approved')
        )
      ORDER BY 
        t.test_mode DESC,
        t.batch_priority ASC NULLS LAST,
        t.step_number DESC,  -- Higher step = higher priority (Stage 2 > Stage 1)
        t.sequence ASC
      LIMIT LEAST(batch_limit, v_slots_available)  -- Respect both limits
      FOR UPDATE OF t SKIP LOCKED  -- Critical: prevents race conditions
    )
    RETURNING *
  )
  SELECT * FROM claimed;
END;
$$;


ALTER FUNCTION "public"."claim_runnable_tasks"("batch_limit" integer, "max_processing" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_runnable_tasks"("batch_limit" integer, "max_processing" integer) IS 'Atomically claims pending tasks for processing with throttling.

Parameters:
  batch_limit: Maximum tasks to claim per call (default: 20)
  max_processing: Only claim if current processing count < this (default: 10)

Features:
  1. Throttling: Won''t claim new tasks if >= max_processing are already processing
  2. Atomic: Tasks marked "processing" in same transaction as selection
  3. SKIP LOCKED: Concurrent calls get different tasks (no duplicates)

Usage in n8n:
  -- Claim up to 20 tasks, but only if < 10 are processing
  SELECT * FROM claim_runnable_tasks(20, 10);
  
  -- More aggressive: allow up to 20 concurrent processing
  SELECT * FROM claim_runnable_tasks(20, 20);
  
  -- Conservative: max 5 concurrent
  SELECT * FROM claim_runnable_tasks(10, 5);
';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_locks"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM workflow_edit_locks WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_locks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_next_stage_tasks"("p_parent_task_id" "uuid", "p_tasks" "text") RETURNS TABLE("task_id" "uuid", "sequence" integer)
    LANGUAGE "plpgsql"
    AS $_$
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
$_$;


ALTER FUNCTION "public"."create_next_stage_tasks"("p_parent_task_id" "uuid", "p_tasks" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_next_stage_tasks"("p_parent_task_id" "uuid", "p_tasks" "text") IS 'Creates child tasks from N8N workflow. Propagates launch_id from parent task to enable Monitor visibility for all pipeline stages.';



CREATE OR REPLACE FUNCTION "public"."create_next_task_in_chain"("p_parent_task_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_parent RECORD;
  v_new_id UUID;
  v_final_output JSONB;
BEGIN
  -- Get parent task fields we still have
  SELECT * INTO v_parent FROM ai_tasks WHERE id = p_parent_task_id;
  
  -- Check if parent has next_task_config (legacy mechanism)
  IF v_parent.next_task_config IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Use edited output if available, otherwise original
  v_final_output := COALESCE(v_parent.edited_output_data, v_parent.output_data);
  
  -- Create new task
  INSERT INTO ai_tasks (
    batch_id,
    lo_code,
    sequence,
    -- task_type is still in ai_tasks
    task_type,
    -- prompt is REMOVED, we rely on prompt_template_id for future runs
    input_data,
    step_number,
    total_steps,
    parent_task_id,
    orchestrator_execution_id,
    next_task_config,
    requires_approval,
    status
  )
  SELECT
    v_parent.batch_id,
    v_parent.lo_code,
    v_parent.sequence,
    v_parent.next_task_config->>'task_type',
    v_final_output,  -- Parent output becomes input
    v_parent.step_number + 1,
    v_parent.total_steps,
    p_parent_task_id,
    v_parent.orchestrator_execution_id,
    v_parent.next_task_config->'next',
    COALESCE((v_parent.next_task_config->>'requires_approval')::BOOLEAN, false),
    'pending'
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;


ALTER FUNCTION "public"."create_next_task_in_chain"("p_parent_task_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_next_task_in_chain"("p_parent_task_id" "uuid") IS 'Creates the next task in a workflow chain with hierarchy tracking. Priority: 
1. Uses next_stage_template_id (reference-based, preferred)
2. Falls back to next_task_config (legacy inline, deprecated)
Auto-populates: root_task_id, hierarchy_path, stage_key';



CREATE OR REPLACE FUNCTION "public"."decrement_star_count"("p_asset_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE hub_assets
    SET star_count = GREATEST(0, star_count - 1),
        updated_at = now()
    WHERE id = p_asset_id;
END;
$$;


ALTER FUNCTION "public"."decrement_star_count"("p_asset_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_batch_cascade"("p_batch_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Due to ON DELETE CASCADE on the ai_tasks foreign key,
    -- simply deleting the batch will automatically delete all related ai_tasks.
    DELETE FROM public.task_batches WHERE id = p_batch_id;
END;
$$;


ALTER FUNCTION "public"."delete_batch_cascade"("p_batch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_batch_progress"("p_batch_id" "uuid") RETURNS TABLE("batch_id" "uuid", "batch_name" character varying, "grade_code" character varying, "preset_key" character varying, "total_tasks" integer, "pending_tasks" integer, "processing_tasks" integer, "completed_tasks" integer, "failed_tasks" integer, "progress_pct" numeric, "status" character varying, "started_at" timestamp with time zone, "elapsed_seconds" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT tb.id, tb.name, tb.grade_code, tb.preset_key, tb.total_tasks, tb.pending_tasks, tb.processing_tasks, tb.completed_tasks, tb.failed_tasks,
        CASE WHEN tb.total_tasks > 0 THEN ROUND(100.0 * tb.completed_tasks / tb.total_tasks, 2) ELSE 0 END::DECIMAL(5,2),
        tb.status, tb.started_at, EXTRACT(EPOCH FROM (now() - tb.started_at))::INT
    FROM task_batches tb WHERE tb.id = p_batch_id;
END;
$$;


ALTER FUNCTION "public"."get_batch_progress"("p_batch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_hierarchy_progress"("p_root_task_id" "uuid") RETURNS TABLE("root_task_id" "uuid", "total_tasks" integer, "completed_tasks" integer, "failed_tasks" integer, "pending_tasks" integer, "processing_tasks" integer, "progress_percentage" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_root_task_id AS root_task_id,
    COUNT(*)::INTEGER AS total_tasks,
    COUNT(*) FILTER (WHERE status IN ('completed', 'approved'))::INTEGER AS completed_tasks,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER AS failed_tasks,
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS pending_tasks,
    COUNT(*) FILTER (WHERE status = 'processing')::INTEGER AS processing_tasks,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE status IN ('completed', 'approved'))::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END AS progress_percentage
  FROM ai_tasks
  WHERE ai_tasks.root_task_id = p_root_task_id
     OR ai_tasks.id = p_root_task_id;
END;
$$;


ALTER FUNCTION "public"."get_hierarchy_progress"("p_root_task_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_hierarchy_progress"("p_root_task_id" "uuid") IS 'Calculate progress for all tasks in a hierarchy using root_task_id';



CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS character varying
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN (SELECT role FROM public.user_profiles WHERE id = auth.uid());
END;
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_tier"() RETURNS character varying
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT tier FROM public.user_profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_tier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_usage"("p_user_id" "uuid") RETURNS TABLE("month" character varying, "task_count" integer, "token_input_count" bigint, "token_output_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT u.month, u.task_count, u.token_input_count, u.token_output_count
  FROM user_usage u
  WHERE u.user_id = p_user_id
  AND u.month = to_char(now(), 'YYYY-MM');
END;
$$;


ALTER FUNCTION "public"."get_user_usage"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_auth_user_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_username text;
    v_full_name text;
    v_avatar_url text;
    v_role text;
BEGIN
    -- Extract values from metadata
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
    v_avatar_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '');
    v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
    v_role := COALESCE(NEW.raw_app_meta_data->>'user_role', 'user');

    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        username,
        avatar_url, 
        role, 
        created_at, 
        updated_at, 
        settings
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_username,
        v_avatar_url,
        v_role,
        NEW.created_at,
        NEW.updated_at,
        '{}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name 
            ELSE public.user_profiles.full_name 
        END,
        username = COALESCE(EXCLUDED.username, public.user_profiles.username),
        avatar_url = CASE 
            WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url 
            ELSE public.user_profiles.avatar_url 
        END,
        -- Force sync role if present in app_metadata, otherwise keep current
        role = COALESCE(NULLIF(NEW.raw_app_meta_data->>'user_role', ''), public.user_profiles.role),
        updated_at = NEW.updated_at;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_auth_user_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_auto_hide_hub_asset"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (SELECT count(*) FROM hub_reports WHERE asset_id = NEW.asset_id AND resolved = FALSE) >= 5 THEN
        UPDATE hub_assets SET is_hidden = TRUE WHERE id = NEW.asset_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_auto_hide_hub_asset"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role, avatar_url, created_at, updated_at, settings)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        'user',
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        now(),
        now(),
        '{}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.user_profiles.full_name),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.user_profiles.avatar_url),
        updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_tier_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.user_profiles 
    SET tier = NEW.tier,
        updated_at = now()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_tier_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_finished_task"("p_batch_id" "uuid", "p_task_id" "uuid") RETURNS TABLE("is_last_task" boolean, "finished_count" integer, "total_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total INTEGER;
  v_finished INTEGER;
BEGIN
  -- 1. Update the task status to completed first (to be safe, though N8N usually does this)
  UPDATE public.ai_tasks 
  SET status = 'completed', 
      completed_at = now() 
  WHERE id = p_task_id;

  -- 2. Atomic increment of finished_tasks in the batch
  UPDATE public.task_batches
  SET finished_tasks = finished_tasks + 1
  WHERE id = p_batch_id
  RETURNING total_tasks, finished_tasks INTO v_total, v_finished;

  -- 3. Return the result
  RETURN QUERY SELECT 
    (v_finished >= v_total) as is_last_task,
    v_finished as finished_count,
    v_total as total_count;
END;
$$;


ALTER FUNCTION "public"."increment_finished_task"("p_batch_id" "uuid", "p_task_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_finished_task"("p_batch_id" "uuid", "p_task_id" "uuid", "p_output_result" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("is_last_task" boolean, "finished_count" integer, "total_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total INTEGER;
  v_completed INTEGER;
  v_failed INTEGER;
  v_requires_approval BOOLEAN;
  v_new_status public.ai_task_status; -- FIXED: Changed from VARCHAR(20) to public.ai_task_status
BEGIN
  -- 1. Get task config
  SELECT requires_approval INTO v_requires_approval
  FROM public.ai_tasks
  WHERE id = p_task_id;

  v_new_status := CASE WHEN v_requires_approval THEN 'awaiting_approval'::public.ai_task_status ELSE 'completed'::public.ai_task_status END;

  -- 2. Update the task status and result
  -- This will fire trigger_update_batch_counters
  UPDATE public.ai_tasks 
  SET status = v_new_status, 
      output_data = p_output_result,
      completed_at = now() 
  WHERE id = p_task_id;

  -- 3. Read trigger-maintained counters from task_batches
  -- We use both completed and failed to determine if it's the absolute last task
  SELECT total_tasks, completed_tasks, failed_tasks 
  INTO v_total, v_completed, v_failed
  FROM public.task_batches
  WHERE id = p_batch_id;

  -- 4. Return the result
  -- is_last_task is true if all tasks are either completed or failed
  RETURN QUERY SELECT 
    (v_completed + v_failed >= v_total) as is_last_task,
    (v_completed + v_failed) as finished_count,
    v_total as total_count;
END;
$$;


ALTER FUNCTION "public"."increment_finished_task"("p_batch_id" "uuid", "p_task_id" "uuid", "p_output_result" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_star_count"("p_asset_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE hub_assets
    SET star_count = star_count + 1,
        updated_at = now()
    WHERE id = p_asset_id;
END;
$$;


ALTER FUNCTION "public"."increment_star_count"("p_asset_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_sync_barrier"("p_sync_group_id" "uuid", "p_task_id" "uuid") RETURNS TABLE("sync_group_id" "uuid", "is_ready" boolean, "waiting_task_ids" "jsonb", "merge_strategy" "text", "next_template_id" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    UPDATE public.task_sync_barriers 
    SET 
        completed_count = completed_count + 1,
        waiting_task_ids = waiting_task_ids || to_jsonb(p_task_id),
        is_ready = (completed_count + 1 >= expected_count),
        updated_at = NOW()
    WHERE public.task_sync_barriers.sync_group_id = p_sync_group_id
    RETURNING 
        public.task_sync_barriers.sync_group_id,
        public.task_sync_barriers.is_ready,
        public.task_sync_barriers.waiting_task_ids,
        public.task_sync_barriers.merge_strategy,
        public.task_sync_barriers.next_template_id;
END;
$$;


ALTER FUNCTION "public"."increment_sync_barrier"("p_sync_group_id" "uuid", "p_task_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_sync_barrier"("p_sync_group_id" "uuid", "p_task_id" "uuid") IS 'Atomically increments a sync barrier for multi-parent task merging. Returns the barrier state.';



CREATE OR REPLACE FUNCTION "public"."increment_user_usage"("p_user_id" "uuid", "p_tasks" integer DEFAULT 1, "p_input_tokens" bigint DEFAULT 0, "p_output_tokens" bigint DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO user_usage (user_id, month, task_count, token_input_count, token_output_count)
  VALUES (p_user_id, to_char(now(), 'YYYY-MM'), p_tasks, p_input_tokens, p_output_tokens)
  ON CONFLICT (user_id, month) DO UPDATE SET
    task_count = user_usage.task_count + p_tasks,
    token_input_count = user_usage.token_input_count + p_input_tokens,
    token_output_count = user_usage.token_output_count + p_output_tokens,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."increment_user_usage"("p_user_id" "uuid", "p_tasks" integer, "p_input_tokens" bigint, "p_output_tokens" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'superadmin')
    FROM public.user_profiles
    WHERE id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_zombie_tasks"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.ai_tasks 
    SET 
        status = 'failed',
        error_message = 'Timeout: No progress for 30 minutes (Zombie detected)'
    WHERE 
        status = 'processing' 
        AND started_at < NOW() - INTERVAL '30 minutes'
        AND updated_at < NOW() - INTERVAL '30 minutes';
END;
$$;


ALTER FUNCTION "public"."mark_zombie_tasks"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_zombie_tasks"() IS 'Marks tasks as failed if they have been processing for too long without updates.';



CREATE OR REPLACE FUNCTION "public"."regenerate_task"("p_task_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Mark original as superseded
  UPDATE ai_tasks SET status = 'regenerated' WHERE id = p_task_id;
  
  -- Clone task
  INSERT INTO ai_tasks (
    batch_id,
    lo_code,
    sequence,
    task_type,
    -- prompt, model_id, temperature are GONE
    input_data,
    step_number,
    total_steps,
    parent_task_id,
    orchestrator_execution_id,
    next_task_config,
    requires_approval,
    status,
    retry_count,
    prompt_template_id,
    stage_key,
    extra,
    split_group_id
  )
  SELECT 
    batch_id,
    lo_code,
    sequence,
    task_type,
    input_data,
    step_number,
    total_steps,
    parent_task_id,
    orchestrator_execution_id,
    next_task_config,
    requires_approval,
    'pending',
    retry_count + 1,
    prompt_template_id,
    stage_key,
    extra,
    split_group_id
  FROM ai_tasks 
  WHERE id = p_task_id
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;


ALTER FUNCTION "public"."regenerate_task"("p_task_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."regenerate_task"("p_task_id" "uuid") IS 'Clones a task for regeneration, marking original as superseded.';



CREATE OR REPLACE FUNCTION "public"."reset_batch_to_pending"("p_batch_id" "uuid", "p_include_completed" boolean DEFAULT false) RETURNS TABLE("reset_count" integer, "task_ids" "uuid"[])
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_statuses TEXT[];
BEGIN
  IF p_include_completed THEN
    v_statuses := ARRAY['pending', 'processing', 'completed', 'failed'];
  ELSE
    v_statuses := ARRAY['processing', 'failed'];
  END IF;
  
  RETURN QUERY SELECT * FROM reset_tasks_to_pending(p_batch_id, v_statuses, TRUE);
END;
$$;


ALTER FUNCTION "public"."reset_batch_to_pending"("p_batch_id" "uuid", "p_include_completed" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_batch_to_pending"("p_batch_id" "uuid", "p_include_completed" boolean) IS 'Reset all tasks in a batch to pending.

Parameters:
  p_batch_id: Batch ID to reset
  p_include_completed: Also reset completed tasks (default: false)

Examples:
  -- Reset failed/processing tasks in batch
  SELECT * FROM reset_batch_to_pending(''33aeae29-9641-4ed2-996b-868e33fdf656'');
  
  -- Reset ALL tasks in batch (including completed)
  SELECT * FROM reset_batch_to_pending(''33aeae29-9641-4ed2-996b-868e33fdf656'', TRUE);
';



CREATE OR REPLACE FUNCTION "public"."reset_tasks_to_pending"("p_batch_id" "uuid" DEFAULT NULL::"uuid", "p_status_filter" "text"[] DEFAULT ARRAY['processing'::"text", 'failed'::"text"], "p_reset_retry_count" boolean DEFAULT false) RETURNS TABLE("reset_count" integer, "task_ids" "uuid"[])
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_ids UUID[];
  v_count INT;
BEGIN
  -- Update tasks matching criteria
  WITH updated AS (
    UPDATE ai_tasks
    SET 
      status = 'pending',
      started_at = NULL,
      completed_at = NULL,
      error_message = NULL,
      retry_count = CASE WHEN p_reset_retry_count THEN 0 ELSE retry_count END
    WHERE 
      status = ANY(p_status_filter)
      AND (p_batch_id IS NULL OR batch_id = p_batch_id)
    RETURNING id
  )
  SELECT ARRAY_AGG(id), COUNT(*)::INT INTO v_ids, v_count FROM updated;
  
  RETURN QUERY SELECT v_count, v_ids;
END;
$$;


ALTER FUNCTION "public"."reset_tasks_to_pending"("p_batch_id" "uuid", "p_status_filter" "text"[], "p_reset_retry_count" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_tasks_to_pending"("p_batch_id" "uuid", "p_status_filter" "text"[], "p_reset_retry_count" boolean) IS 'Reset tasks to pending status for retry.

Parameters:
  p_batch_id: Optional - only reset tasks in this batch (NULL = all batches)
  p_status_filter: Array of statuses to reset (default: processing, failed)
  p_reset_retry_count: Reset retry_count to 0 (default: false)

Examples:
  -- Reset all failed tasks
  SELECT * FROM reset_tasks_to_pending();
  
  -- Reset specific batch
  SELECT * FROM reset_tasks_to_pending(''33aeae29-9641-4ed2-996b-868e33fdf656'');
  
  -- Reset only failed tasks in a batch, with retry count reset
  SELECT * FROM reset_tasks_to_pending(
    ''33aeae29-9641-4ed2-996b-868e33fdf656'',
    ARRAY[''failed''],
    TRUE
  );
  
  -- Reset stuck processing tasks
  SELECT * FROM reset_tasks_to_pending(NULL, ARRAY[''processing'']);
';



CREATE OR REPLACE FUNCTION "public"."retry_all_failed_in_batch"("p_batch_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_retry_count integer;
BEGIN
    -- Count how many tasks we're going to update
    SELECT COUNT(*) INTO v_retry_count
    FROM public.ai_tasks
    WHERE batch_id = p_batch_id AND status = 'failed';

    IF v_retry_count = 0 THEN
        RETURN 0;
    END IF;

    -- Update all failed tasks to pending
    UPDATE public.ai_tasks
    SET status = 'pending',
        error_message = NULL,
        retry_count = COALESCE(retry_count, 0) + 1
    WHERE batch_id = p_batch_id AND status = 'failed';

    -- Update batch counters
    UPDATE public.task_batches
    SET failed_tasks = GREATEST(0, failed_tasks - v_retry_count),
        pending_tasks = pending_tasks + v_retry_count,
        status = CASE 
            WHEN status IN ('completed', 'failed') THEN 'processing'
            ELSE status 
        END
    WHERE id = p_batch_id;

    RETURN v_retry_count;
END;
$$;


ALTER FUNCTION "public"."retry_all_failed_in_batch"("p_batch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."retry_failed_task"("p_task_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_batch_id uuid;
    v_status varchar;
BEGIN
    SELECT batch_id, status INTO v_batch_id, v_status
    FROM public.ai_tasks
    WHERE id = p_task_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    IF v_status != 'failed' THEN
        RAISE EXCEPTION 'Only failed tasks can be retried';
    END IF;

    -- Update task status
    UPDATE public.ai_tasks
    SET status = 'pending',
        error_message = NULL,
        retry_count = COALESCE(retry_count, 0) + 1
    WHERE id = p_task_id;

    -- Update batch counters: reduce failed_tasks, increase pending_tasks
    IF v_batch_id IS NOT NULL THEN
        UPDATE public.task_batches
        SET failed_tasks = GREATEST(0, failed_tasks - 1),
            pending_tasks = pending_tasks + 1,
            -- If it was completed/failed and now has pending tasks, set to processing
            status = CASE 
                WHEN status IN ('completed', 'failed') THEN 'processing'
                ELSE status 
            END
        WHERE id = v_batch_id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."retry_failed_task"("p_task_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_current_timestamp_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_changes_to_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  app_meta_updates jsonb;
  user_meta_updates jsonb;
  has_app_meta_changes boolean := false;
  has_user_meta_changes boolean := false;
BEGIN
  app_meta_updates := '{}'::jsonb;
  user_meta_updates := '{}'::jsonb;

  -- Kiểm tra và xây dựng các cập nhật cho raw_app_meta_data
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    app_meta_updates := jsonb_set(app_meta_updates, '{user_role}', to_jsonb(NEW.role));
    has_app_meta_changes := true;
  END IF;

  -- Kiểm tra và xây dựng các cập nhật cho raw_user_meta_data
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    user_meta_updates := jsonb_set(user_meta_updates, '{full_name}', to_jsonb(NEW.full_name));
    has_user_meta_changes := true;
  END IF;
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    user_meta_updates := jsonb_set(user_meta_updates, '{avatar_url}', to_jsonb(NEW.avatar_url));
    has_user_meta_changes := true;
  END IF;
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    user_meta_updates := jsonb_set(user_meta_updates, '{username}', to_jsonb(NEW.username));
    has_user_meta_changes := true;
  END IF;
  -- Thêm các trường khác từ user_profiles bạn muốn đồng bộ vào raw_user_meta_data ở đây

  -- Chỉ thực hiện UPDATE nếu có gì đó để cập nhật
  IF has_app_meta_changes OR has_user_meta_changes THEN
    UPDATE auth.users
    SET
      raw_app_meta_data = CASE
                            WHEN has_app_meta_changes THEN COALESCE(raw_app_meta_data, '{}'::jsonb) || app_meta_updates
                            ELSE raw_app_meta_data
                          END,
      raw_user_meta_data = CASE
                             WHEN has_user_meta_changes THEN COALESCE(raw_user_meta_data, '{}'::jsonb) || user_meta_updates
                             ELSE raw_user_meta_data
                           END
    WHERE id = NEW.id;
    RAISE LOG 'Synced auth.users metadata for user % due to user_profiles update', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_profile_changes_to_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_batch_counters"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_task_batch_counters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_model_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "temperature" numeric DEFAULT 1.0,
    "top_p" numeric DEFAULT 0.95,
    "top_k" integer DEFAULT 40,
    "max_output_tokens" integer DEFAULT 8192,
    "generate_content_api" "text" DEFAULT 'generateContent'::"text",
    "timeout_ms" integer DEFAULT 300000,
    "retries" integer DEFAULT 3,
    "is_active" boolean DEFAULT true,
    "organization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category" "text",
    "tagline" "text",
    "supported_inputs" "jsonb" DEFAULT '["Text"]'::"jsonb",
    "supported_outputs" "jsonb" DEFAULT '["Text"]'::"jsonb",
    "input_token_limit" integer DEFAULT 1048576,
    "output_token_limit" integer DEFAULT 65536,
    "capabilities" "jsonb" DEFAULT '{}'::"jsonb",
    "thinking_config_type" "text" DEFAULT 'none'::"text",
    "recommended_thinking" "text",
    "free_tier_rpm" integer,
    "free_tier_tpm" integer,
    "free_tier_rpd" integer,
    "use_case_tags" "jsonb" DEFAULT '[]'::"jsonb",
    "user_id" "uuid"
);


ALTER TABLE "public"."ai_model_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prompt_templates" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "template" "text" NOT NULL,
    "version" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "input_schema" "jsonb",
    "output_schema" "jsonb",
    "default_ai_settings" "jsonb" DEFAULT '{"model_id": "gemini-2.5-flash", "temperature": 0.7}'::"jsonb",
    "organization_code" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "next_stage_template_id" "text",
    "stage_config" "jsonb" DEFAULT '{}'::"jsonb",
    "requires_approval" boolean DEFAULT false,
    "next_stage_template_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "custom_component_id" "uuid",
    "view_config" "jsonb" DEFAULT '{}'::"jsonb",
    "stage_key" "text",
    "hub_asset_id" "uuid",
    "is_public" boolean DEFAULT false
);


ALTER TABLE "public"."prompt_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."prompt_templates" IS 'Reusable prompt templates for AI task generation. Tasks reference these by ID instead of storing full prompts.';



COMMENT ON COLUMN "public"."prompt_templates"."template" IS 'Prompt template with placeholders: {{input_data}}, {{lo_code}}, {{context}}';



COMMENT ON COLUMN "public"."prompt_templates"."next_stage_template_id" IS 'ID of the next stage template in a multi-stage orchestrator workflow';



COMMENT ON COLUMN "public"."prompt_templates"."next_stage_template_ids" IS 'Array of prompt_template IDs for downstream parallel branches';



COMMENT ON COLUMN "public"."prompt_templates"."stage_key" IS 'Identifies the logical stage key for routing and variable substitution.';



CREATE OR REPLACE VIEW "public"."ai_tasks_with_template" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    "t"."task_type",
    "t"."status",
    "t"."input_data",
    "t"."output_data",
    "t"."error_message",
    "t"."user_id",
    "t"."n8n_execution_id",
    "t"."created_at",
    "t"."started_at",
    "t"."completed_at",
    "t"."orchestrator_tracking",
    "t"."agent_id",
    "t"."batch_priority",
    "t"."test_mode",
    "t"."batch_id",
    "t"."lo_code",
    "t"."sequence",
    "t"."phase_code",
    "t"."retry_count",
    "t"."step_id",
    "t"."parent_task_id",
    "t"."step_number",
    "t"."total_steps",
    "t"."next_task_config",
    "t"."orchestrator_execution_id",
    "t"."step_execution_id",
    "t"."requires_approval",
    "t"."approved_at",
    "t"."approved_by",
    "t"."edited_output_data",
    "t"."edit_notes",
    "t"."prompt_template_id",
    "t"."root_task_id",
    "t"."hierarchy_path",
    "t"."stage_key",
    "t"."extra",
    "t"."split_group_id",
    "t"."launch_id",
    "pt"."template" AS "prompt_text",
    "pt"."stage_config",
    "pt"."default_ai_settings",
    "pt"."next_stage_template_ids"
   FROM ("public"."ai_tasks" "t"
     LEFT JOIN "public"."prompt_templates" "pt" ON (("t"."prompt_template_id" = "pt"."id")));


ALTER TABLE "public"."ai_tasks_with_template" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alembic_version" (
    "version_num" character varying(32) NOT NULL
);


ALTER TABLE "public"."alembic_version" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_key_health" (
    "user_api_key_id" "uuid" NOT NULL,
    "last_used_at" timestamp with time zone,
    "last_success_at" timestamp with time zone,
    "last_failure_at" timestamp with time zone,
    "consecutive_failures" integer DEFAULT 0 NOT NULL,
    "total_requests" integer DEFAULT 0 NOT NULL,
    "successful_requests" integer DEFAULT 0 NOT NULL,
    "failed_requests" integer DEFAULT 0 NOT NULL,
    "blocked_until" timestamp with time zone,
    "block_reason" character varying(255),
    "last_error_code" character varying(50),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."api_key_health" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_key_usage_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_api_key_id" "uuid" NOT NULL,
    "task_id" "uuid",
    "job_id" "uuid",
    "request_type" character varying(50),
    "model_used" character varying(50),
    "tokens_used" integer,
    "success" boolean,
    "error_code" character varying(50),
    "error_message" "text",
    "latency_ms" integer,
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata_json" "jsonb",
    "user_id" "uuid"
);


ALTER TABLE "public"."api_key_usage_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_jobs" (
    "id" character varying(50) NOT NULL,
    "user_id" "uuid",
    "user_email" character varying(255),
    "los_count" integer,
    "sheet_id" character varying(255),
    "sheet_url" character varying(500),
    "tab_name" character varying(255),
    "status" character varying(50),
    "created_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "questions_completed" integer DEFAULT 0,
    "questions_failed" integer DEFAULT 0,
    "error_message" "text",
    "questions_per_lo" integer DEFAULT 1,
    "diversity_metrics" "jsonb",
    "retry_count" integer DEFAULT 0
);


ALTER TABLE "public"."batch_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_questions" (
    "id" character varying(50) NOT NULL,
    "batch_id" character varying(50) NOT NULL,
    "lo_code" character varying(50),
    "status" character varying(50),
    "question_data" "jsonb",
    "error_message" "text",
    "error_severity" character varying(50),
    "retry_count" integer DEFAULT 0,
    "created_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "generated_count" integer DEFAULT 1,
    "user_id" "uuid"
);


ALTER TABLE "public"."batch_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blueprint_presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "grade_code" "text" NOT NULL,
    "preset_key" "text" NOT NULL,
    "version" integer DEFAULT 1,
    "content" "text" NOT NULL,
    "lo_count" integer DEFAULT 0,
    "file_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."blueprint_presets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category_subjects" (
    "category_code" character varying(100) NOT NULL,
    "subject_code" character varying(50) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."category_subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."celery_task_history" (
    "id" "uuid" NOT NULL,
    "task_id" character varying(255) NOT NULL,
    "task_name" character varying(255) NOT NULL,
    "state" character varying(50) NOT NULL,
    "worker" character varying(255),
    "args" "jsonb",
    "kwargs" "jsonb",
    "result" "jsonb",
    "exception" "text",
    "traceback" "text",
    "received_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "runtime_seconds" double precision,
    "retries" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."celery_task_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."concepts" (
    "code" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "category" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."concepts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_workspaces" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "user_id" "uuid" NOT NULL,
    "curriculum_id" integer,
    "knowledge_tree_id" integer,
    "course_context" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_workspaces" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."course_workspaces_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."course_workspaces_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."course_workspaces_id_seq" OWNED BY "public"."course_workspaces"."id";



CREATE TABLE IF NOT EXISTS "public"."curricula" (
    "id" integer NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."curricula" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."curricula_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."curricula_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."curricula_id_seq" OWNED BY "public"."curricula"."id";



CREATE TABLE IF NOT EXISTS "public"."curriculum_lessons" (
    "id" integer NOT NULL,
    "curriculum_id" integer NOT NULL,
    "lesson_code" character varying(100) NOT NULL,
    "lesson_name" character varying(500) NOT NULL,
    "unit_code" character varying(100),
    "unit_name" character varying(255),
    "module_name" character varying(255),
    "activities_json" "jsonb" NOT NULL,
    "display_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "module_code" character varying(100)
);


ALTER TABLE "public"."curriculum_lessons" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."curriculum_lessons_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."curriculum_lessons_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."curriculum_lessons_id_seq" OWNED BY "public"."curriculum_lessons"."id";



CREATE TABLE IF NOT EXISTS "public"."curriculum_modules" (
    "id" integer NOT NULL,
    "unit_id" integer NOT NULL,
    "module_code" character varying(100) NOT NULL,
    "module_name" character varying(255) NOT NULL,
    "approach" character varying(50) NOT NULL,
    "context" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."curriculum_modules" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."curriculum_modules_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."curriculum_modules_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."curriculum_modules_id_seq" OWNED BY "public"."curriculum_modules"."id";



CREATE TABLE IF NOT EXISTS "public"."curriculum_units" (
    "id" integer NOT NULL,
    "curriculum_id" integer NOT NULL,
    "unit_code" character varying(100) NOT NULL,
    "unit_name" character varying(255) NOT NULL,
    "module_code" character varying(100),
    "module_name" character varying(255),
    "display_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."curriculum_units" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."curriculum_units_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."curriculum_units_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."curriculum_units_id_seq" OWNED BY "public"."curriculum_units"."id";



CREATE TABLE IF NOT EXISTS "public"."curriculum_units_v2" (
    "id" integer NOT NULL,
    "workspace_id" integer NOT NULL,
    "unit_code" character varying(100) NOT NULL,
    "unit_name" character varying(255) NOT NULL,
    "context" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."curriculum_units_v2" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."curriculum_units_v2_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."curriculum_units_v2_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."curriculum_units_v2_id_seq" OWNED BY "public"."curriculum_units_v2"."id";



CREATE TABLE IF NOT EXISTS "public"."custom_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "code" "text" NOT NULL,
    "mock_data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "hub_asset_id" "uuid"
);


ALTER TABLE "public"."custom_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hub_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_type" "text" NOT NULL,
    "ref_id" "uuid" NOT NULL,
    "creator_id" "uuid",
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "thumbnail_url" "text",
    "source_asset_id" "uuid",
    "parent_asset_id" "uuid",
    "remix_depth" integer DEFAULT 0 NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "is_hidden" boolean DEFAULT false NOT NULL,
    "license" "text" DEFAULT 'orchable-free'::"text" NOT NULL,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "stripe_product_id" "text",
    "install_count" integer DEFAULT 0 NOT NULL,
    "star_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "hub_assets_asset_type_check" CHECK (("asset_type" = ANY (ARRAY['orchestration'::"text", 'template'::"text", 'component'::"text", 'ai_preset'::"text", 'bundle'::"text"])))
);


ALTER TABLE "public"."hub_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hub_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid",
    "reporter_id" "uuid",
    "reason" "text" NOT NULL,
    "details" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "resolved_by" "uuid"
);


ALTER TABLE "public"."hub_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hub_stars" (
    "asset_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "starred_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hub_stars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_categories" (
    "code" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "display_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_fields" (
    "code" character varying(10) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "display_order" integer,
    "keywords" character varying[],
    "cs2023_ka_mapping" character varying(255),
    "meta_data" "json",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_subjects" (
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "keywords" character varying[],
    "cs2023_ka_mapping" character varying(255),
    "meta_data" "json",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_topics" (
    "code" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "display_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_trees" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "version" character varying(50),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_trees" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."knowledge_trees_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."knowledge_trees_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."knowledge_trees_id_seq" OWNED BY "public"."knowledge_trees"."id";



CREATE TABLE IF NOT EXISTS "public"."lab_orchestrator_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "steps" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "viewport" "jsonb" DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::"jsonb",
    "n8n_workflow_id" "text",
    "input_mapping" "jsonb",
    "hub_asset_id" "uuid",
    "is_public" boolean DEFAULT false,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "valid_steps" CHECK (("jsonb_typeof"("steps") = 'array'::"text"))
);


ALTER TABLE "public"."lab_orchestrator_configs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lab_orchestrator_configs"."input_mapping" IS 'Stores JSON input configuration including file name, field selections (shared vs per-task), and manual field mappings.';



CREATE TABLE IF NOT EXISTS "public"."learning_objective_concepts" (
    "lo_code" character varying(100) NOT NULL,
    "concept_code" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."learning_objective_concepts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_objectives" (
    "code" character varying(100) NOT NULL,
    "name" character varying(500) NOT NULL,
    "description" "text",
    "lo_type" character varying(20) NOT NULL,
    "parent_lo_code" character varying(100),
    "concept_codes" character varying[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."learning_objectives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orchestrator_executions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "orchestrator_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_email" character varying(255),
    "status" character varying(30) DEFAULT 'pending'::character varying,
    "current_phase_id" "uuid",
    "current_step_id" "uuid",
    "input_data" "jsonb" NOT NULL,
    "output_data" "jsonb",
    "error_message" "text",
    "error_phase_id" "uuid",
    "error_step_id" "uuid",
    "n8n_execution_id" character varying(255),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "orchestrator_executions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'awaiting_approval'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."orchestrator_executions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orchestrator_phases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "orchestrator_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "n8n_workflow_id" character varying(255),
    "n8n_webhook_path" character varying(255),
    "requires_approval" boolean DEFAULT false,
    "approval_message" "text",
    "on_error" character varying(50) DEFAULT 'stop'::character varying,
    "fallback_workflow_id" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "orchestrator_phases_on_error_check" CHECK ((("on_error")::"text" = ANY ((ARRAY['stop'::character varying, 'skip'::character varying, 'fallback'::character varying])::"text"[])))
);


ALTER TABLE "public"."orchestrator_phases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orchestrator_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phase_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "n8n_workflow_id" character varying(255),
    "n8n_webhook_path" character varying(255),
    "handler_endpoint" character varying(255),
    "timeout_seconds" integer DEFAULT 300,
    "retry_count" integer DEFAULT 3,
    "input_schema" "jsonb",
    "output_schema" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "runner_type" character varying(20) DEFAULT 'n8n'::character varying NOT NULL,
    "workflow_file" character varying(255)
);


ALTER TABLE "public"."orchestrator_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orchestrators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "category" character varying(50) NOT NULL,
    "is_template" boolean DEFAULT true,
    "template_id" "uuid",
    "created_by" "uuid",
    "is_system" boolean DEFAULT false,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "orchestrators_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'archived'::character varying])::"text"[])))
);


ALTER TABLE "public"."orchestrators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."step_executions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "execution_id" "uuid" NOT NULL,
    "step_id" "uuid" NOT NULL,
    "status" character varying(30) DEFAULT 'pending'::character varying,
    "n8n_execution_id" character varying(255),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "input_data" "jsonb",
    "output_data" "jsonb",
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "lobster_token" character varying(512),
    "user_id" "uuid",
    CONSTRAINT "valid_step_execution_status" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'skipped'::character varying, 'awaiting_approval'::character varying])::"text"[])))
);


ALTER TABLE "public"."step_executions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subject_fields" (
    "subject_code" character varying(50) NOT NULL,
    "field_code" character varying(10) NOT NULL,
    "is_primary" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subject_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_prompt_history" (
    "id" "uuid" NOT NULL,
    "prompt_key" character varying(100) NOT NULL,
    "override_template" "text" NOT NULL,
    "edited_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "override_id" "uuid"
);


ALTER TABLE "public"."system_prompt_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_prompt_overrides" (
    "id" "uuid" NOT NULL,
    "prompt_key" character varying(100) NOT NULL,
    "override_template" "text" NOT NULL,
    "edited_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_prompt_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "source_file" character varying(255),
    "preset_key" character varying(50),
    "grade_code" character varying(10),
    "exam_round_code" character varying(50),
    "week_range" character varying(20),
    "total_tasks" integer DEFAULT 0 NOT NULL,
    "pending_tasks" integer DEFAULT 0 NOT NULL,
    "processing_tasks" integer DEFAULT 0 NOT NULL,
    "completed_tasks" integer DEFAULT 0 NOT NULL,
    "failed_tasks" integer DEFAULT 0 NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "n8n_workflow_id" character varying(255),
    "n8n_execution_id" character varying(255),
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "batch_type" character varying(50) DEFAULT 'generic'::character varying,
    "orchestrator_config_id" "uuid",
    "launch_id" "uuid",
    "finished_tasks" integer DEFAULT 0,
    "is_public" boolean DEFAULT false,
    CONSTRAINT "task_batches_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'paused'::character varying])::"text"[])))
);


ALTER TABLE "public"."task_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_sync_barriers" (
    "sync_group_id" "uuid" NOT NULL,
    "expected_count" integer NOT NULL,
    "merge_strategy" "text",
    "next_template_id" "text",
    "completed_count" integer DEFAULT 0,
    "waiting_task_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "is_ready" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_sync_barriers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_categories" (
    "topic_code" character varying(100) NOT NULL,
    "category_code" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."topic_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_learning_objectives" (
    "topic_code" character varying(100) NOT NULL,
    "lo_code" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."topic_learning_objectives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "key_name" character varying(100) NOT NULL,
    "api_key_encrypted" "text" NOT NULL,
    "model_preference" character varying(50) DEFAULT 'gemini-2.5-flash'::character varying NOT NULL,
    "thinking_mode_enabled" boolean DEFAULT false NOT NULL,
    "thinking_token_limit" integer DEFAULT 8000 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "priority" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pool_type" "public"."api_key_pool_type" DEFAULT 'personal'::"public"."api_key_pool_type"
);


ALTER TABLE "public"."user_api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_generated_resources" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource_type" character varying(50) NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."user_generated_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" character varying DEFAULT 'user'::character varying NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "username" "text",
    "settings" "jsonb",
    "tier" character varying DEFAULT 'free'::character varying,
    CONSTRAINT "user_profiles_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'superadmin'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_prompt_customizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "prompt_key" character varying(100) NOT NULL,
    "custom_template" character varying NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_prompt_customizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_saved_resources" (
    "resource_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource_code" character varying(100) NOT NULL,
    "title" "text",
    "content" "text",
    "supabase_path" character varying(500) NOT NULL,
    "metadata_json" "jsonb",
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."user_saved_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tier" character varying DEFAULT 'free'::character varying NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_subscriptions_tier_check" CHECK ((("tier")::"text" = ANY ((ARRAY['free'::character varying, 'premium'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month" character varying(7) NOT NULL,
    "task_count" integer DEFAULT 0,
    "token_input_count" bigint DEFAULT 0,
    "token_output_count" bigint DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_usage" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_failed_tasks_for_retry" WITH ("security_invoker"='true') AS
 SELECT "at"."id" AS "task_id",
    "at"."batch_id",
    "tb"."name" AS "batch_name",
    "tb"."grade_code",
    "at"."lo_code",
    "at"."task_type",
    "at"."error_message",
    "at"."retry_count",
    "at"."created_at",
    "at"."completed_at" AS "failed_at"
   FROM ("public"."ai_tasks" "at"
     JOIN "public"."task_batches" "tb" ON (("tb"."id" = "at"."batch_id")))
  WHERE ((("at"."status")::"text" = 'failed'::"text") AND ("at"."retry_count" < 3))
  ORDER BY "at"."completed_at" DESC;


ALTER TABLE "public"."v_failed_tasks_for_retry" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_processing_tasks" WITH ("security_invoker"='true') AS
 SELECT "at"."id" AS "task_id",
    "at"."batch_id",
    "tb"."name" AS "batch_name",
    "tb"."grade_code",
    "at"."lo_code",
    "at"."task_type",
    "at"."n8n_execution_id",
    "at"."started_at",
    (EXTRACT(epoch FROM ("now"() - "at"."started_at")))::integer AS "running_seconds"
   FROM ("public"."ai_tasks" "at"
     LEFT JOIN "public"."task_batches" "tb" ON (("tb"."id" = "at"."batch_id")))
  WHERE (("at"."status")::"text" = 'processing'::"text")
  ORDER BY "at"."started_at" DESC;


ALTER TABLE "public"."v_processing_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_runnable_tasks" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    COALESCE("t"."task_type", (("pt"."stage_config" ->> 'type'::"text"))::character varying) AS "task_type",
    "t"."status",
    "t"."input_data",
    ("pt"."default_ai_settings" ->> 'model_id'::"text") AS "model_id",
    ((("pt"."default_ai_settings" -> 'generationConfig'::"text") ->> 'temperature'::"text"))::numeric AS "temperature",
    "pt"."default_ai_settings" AS "ai_settings",
    "t"."agent_id",
    "t"."batch_priority",
    "t"."test_mode",
    "t"."batch_id",
    "t"."launch_id",
    "t"."lo_code",
    "t"."sequence",
    "t"."phase_code",
    "t"."retry_count",
    "t"."step_id",
    "t"."parent_task_id",
    "t"."root_task_id",
    "t"."hierarchy_path",
    "t"."stage_key",
    "t"."step_number",
    "t"."total_steps",
    "t"."next_task_config",
    "t"."orchestrator_execution_id",
    "t"."step_execution_id",
    "t"."requires_approval",
    "t"."prompt_template_id",
    "pt"."next_stage_template_ids",
    "pt"."next_stage_template_ids"[1] AS "next_stage_template_id",
    "t"."created_at",
    "t"."extra",
    "t"."split_group_id",
    "t"."user_id",
    "b"."status" AS "batch_status",
    "b"."name" AS "batch_name"
   FROM ((("public"."ai_tasks" "t"
     LEFT JOIN "public"."prompt_templates" "pt" ON (("t"."prompt_template_id" = "pt"."id")))
     LEFT JOIN "public"."ai_tasks" "parent" ON (("t"."parent_task_id" = "parent"."id")))
     LEFT JOIN "public"."task_batches" "b" ON (("t"."batch_id" = "b"."id")))
  WHERE ((("t"."status")::"text" = 'plan'::"text") AND (("t"."parent_task_id" IS NULL) OR (("parent"."status")::"text" = ANY (ARRAY['completed'::"text", 'generated'::"text", 'approved'::"text"]))))
  ORDER BY "t"."test_mode" DESC, "t"."batch_priority", "t"."step_number", "t"."sequence";


ALTER TABLE "public"."v_runnable_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_stuck_tasks" WITH ("security_invoker"='true') AS
 SELECT "at"."id" AS "task_id",
    "at"."batch_id",
    "tb"."name" AS "batch_name",
    "tb"."grade_code",
    "at"."lo_code",
    "at"."task_type",
    "at"."phase_code",
    "at"."error_message",
    "at"."retry_count",
    "at"."created_at",
    "at"."completed_at" AS "failed_at"
   FROM ("public"."ai_tasks" "at"
     LEFT JOIN "public"."task_batches" "tb" ON (("tb"."id" = "at"."batch_id")))
  WHERE ((("at"."status")::"text" = 'failed'::"text") AND ("at"."retry_count" >= 3))
  ORDER BY "at"."completed_at" DESC;


ALTER TABLE "public"."v_stuck_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_tasks_awaiting_approval" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    "t"."status",
    "t"."input_data",
    "t"."output_data",
    "t"."requires_approval",
    "t"."approved_at",
    "t"."approved_by",
    "t"."edit_notes",
    "t"."edited_output_data",
    "t"."prompt_template_id",
    "t"."batch_id",
    "t"."stage_key",
    "t"."sequence",
    "t"."total_steps",
    "t"."created_at",
    "t"."completed_at",
    "b"."name" AS "batch_name",
    "b"."grade_code",
    "b"."preset_key",
    "pt"."template" AS "prompt",
    "pt"."default_ai_settings" AS "ai_settings"
   FROM (("public"."ai_tasks" "t"
     LEFT JOIN "public"."task_batches" "b" ON (("t"."batch_id" = "b"."id")))
     LEFT JOIN "public"."prompt_templates" "pt" ON (("t"."prompt_template_id" = "pt"."id")))
  WHERE (("t"."status")::"text" = 'awaiting_approval'::"text");


ALTER TABLE "public"."v_tasks_awaiting_approval" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_edit_locks" (
    "lock_id" "uuid" NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "locked_by" character varying(255) NOT NULL,
    "locked_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "locked_by_id" "uuid",
    CONSTRAINT "valid_lock_entity_type" CHECK ((("entity_type")::"text" = ANY ((ARRAY['syllabus'::character varying, 'resource_spec'::character varying])::"text"[])))
);


ALTER TABLE "public"."workflow_edit_locks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_errors" (
    "error_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "phase" character varying(50) NOT NULL,
    "error_type" character varying(255) NOT NULL,
    "error_message" "text" NOT NULL,
    "context_json" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."workflow_errors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_jobs" (
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "user_email" character varying(255) NOT NULL,
    "state" character varying(50) NOT NULL,
    "course_config" "jsonb" NOT NULL,
    "api_key_encrypted" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "celery_task_id" character varying(255),
    "n8n_workflow_id" character varying(255),
    "n8n_execution_id" character varying(255),
    "use_n8n" boolean,
    "task_id" "uuid",
    "discovery_context" "jsonb",
    "selected_resources" "jsonb",
    "resource_list" "jsonb",
    "readiness_status" "jsonb" DEFAULT '{}'::"jsonb",
    "coherence_reports" "jsonb",
    "teacher_guide" "text",
    "student_guide" "text",
    "package_url" character varying(500),
    CONSTRAINT "valid_state" CHECK ((("state")::"text" = ANY ((ARRAY['init'::character varying, 'generating_syllabi'::character varying, 'awaiting_syllabus_review'::character varying, 'generating_resource_specs'::character varying, 'awaiting_resource_review'::character varying, 'generating_resources'::character varying, 'generating_guides'::character varying, 'packaging'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'paused_no_keys'::character varying])::"text"[])))
);


ALTER TABLE "public"."workflow_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_progress" (
    "progress_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "phase" character varying(50) NOT NULL,
    "total_items" integer NOT NULL,
    "completed_items" integer DEFAULT 0,
    "progress_percentage" double precision DEFAULT '0'::double precision,
    "status" character varying(50) DEFAULT 'in_progress'::character varying,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."workflow_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_registry" (
    "registry_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "n8n_workflow_id" character varying(255) NOT NULL,
    "workflow_name" character varying(255) NOT NULL,
    "workflow_description" "text",
    "is_active" boolean DEFAULT false,
    "webhook_path" character varying(255),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "synced_at" timestamp with time zone
);


ALTER TABLE "public"."workflow_registry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_resource_specs" (
    "spec_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "version" integer,
    "status" character varying(50),
    "review_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "unit_index" integer NOT NULL,
    "spec_content" "jsonb" NOT NULL,
    "validation_score" double precision DEFAULT '0'::double precision,
    "validation_errors" "jsonb" DEFAULT '[]'::"jsonb",
    "validation_warnings" "jsonb" DEFAULT '[]'::"jsonb",
    "learning_objective_codes" character varying[] DEFAULT '{}'::character varying[],
    "user_id" "uuid",
    CONSTRAINT "valid_spec_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'awaiting_review'::character varying, 'reviewed'::character varying, 'approved'::character varying])::"text"[])))
);


ALTER TABLE "public"."workflow_resource_specs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_resources" (
    "resource_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "lesson_id" character varying(50) NOT NULL,
    "resource_type" character varying(50) NOT NULL,
    "content" "jsonb",
    "file_path" character varying(500),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "unit_index" integer NOT NULL,
    "metadata_json" "jsonb" DEFAULT '{}'::"jsonb",
    "status" character varying(50) DEFAULT 'generated'::character varying,
    "user_id" "uuid",
    CONSTRAINT "valid_resource_type" CHECK ((("resource_type")::"text" = ANY ((ARRAY['lesson_plan'::character varying, 'activity'::character varying, 'question'::character varying, 'slide'::character varying, 'asset'::character varying, 'glossary'::character varying])::"text"[])))
);


ALTER TABLE "public"."workflow_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_syllabi" (
    "syllabus_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "unit_index" integer NOT NULL,
    "unit_name" character varying(255) NOT NULL,
    "approach" character varying(50) NOT NULL,
    "content" "text" NOT NULL,
    "version" integer,
    "status" character varying(50),
    "review_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    CONSTRAINT "valid_approach" CHECK ((("approach")::"text" = ANY ((ARRAY['PBL'::character varying, 'LbDP'::character varying])::"text"[]))),
    CONSTRAINT "valid_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'awaiting_review'::character varying, 'reviewed'::character varying, 'approved'::character varying])::"text"[])))
);


ALTER TABLE "public"."workflow_syllabi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_tasks" (
    "task_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_key" character varying(100) NOT NULL,
    "task_name" character varying(255) NOT NULL,
    "task_description" "text",
    "icon_name" character varying(50),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "is_system" boolean DEFAULT false
);


ALTER TABLE "public"."workflow_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_versions" (
    "version_id" "uuid" NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "content" "text" NOT NULL,
    "created_by" "uuid",
    "change_notes" "text",
    "is_approved" boolean,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_entity_type" CHECK ((("entity_type")::"text" = ANY ((ARRAY['syllabus'::character varying, 'resource_spec'::character varying])::"text"[])))
);


ALTER TABLE "public"."workflow_versions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."course_workspaces" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."course_workspaces_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."curricula" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."curricula_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."curriculum_lessons" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."curriculum_lessons_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."curriculum_modules" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."curriculum_modules_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."curriculum_units" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."curriculum_units_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."curriculum_units_v2" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."curriculum_units_v2_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."knowledge_trees" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."knowledge_trees_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_model_settings"
    ADD CONSTRAINT "ai_model_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_model_settings"
    ADD CONSTRAINT "ai_model_settings_user_model_unique" UNIQUE ("user_id", "model_id");



ALTER TABLE ONLY "public"."ai_tasks"
    ADD CONSTRAINT "ai_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alembic_version"
    ADD CONSTRAINT "alembic_version_pkc" PRIMARY KEY ("version_num");



ALTER TABLE ONLY "public"."api_key_health"
    ADD CONSTRAINT "api_key_health_pkey" PRIMARY KEY ("user_api_key_id");



ALTER TABLE ONLY "public"."api_key_usage_log"
    ADD CONSTRAINT "api_key_usage_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_questions"
    ADD CONSTRAINT "batch_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blueprint_presets"
    ADD CONSTRAINT "blueprint_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_subjects"
    ADD CONSTRAINT "category_subjects_pkey" PRIMARY KEY ("category_code", "subject_code");



ALTER TABLE ONLY "public"."celery_task_history"
    ADD CONSTRAINT "celery_task_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."celery_task_history"
    ADD CONSTRAINT "celery_task_history_task_id_key" UNIQUE ("task_id");



ALTER TABLE ONLY "public"."concepts"
    ADD CONSTRAINT "concepts_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."course_workspaces"
    ADD CONSTRAINT "course_workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curricula"
    ADD CONSTRAINT "curricula_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."curricula"
    ADD CONSTRAINT "curricula_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curriculum_lessons"
    ADD CONSTRAINT "curriculum_lessons_lesson_code_key" UNIQUE ("lesson_code");



ALTER TABLE ONLY "public"."curriculum_lessons"
    ADD CONSTRAINT "curriculum_lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curriculum_modules"
    ADD CONSTRAINT "curriculum_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curriculum_units"
    ADD CONSTRAINT "curriculum_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curriculum_units_v2"
    ADD CONSTRAINT "curriculum_units_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_components"
    ADD CONSTRAINT "custom_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hub_assets"
    ADD CONSTRAINT "hub_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hub_assets"
    ADD CONSTRAINT "hub_assets_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."hub_reports"
    ADD CONSTRAINT "hub_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hub_stars"
    ADD CONSTRAINT "hub_stars_pkey" PRIMARY KEY ("asset_id", "user_id");



ALTER TABLE ONLY "public"."knowledge_categories"
    ADD CONSTRAINT "knowledge_categories_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."knowledge_fields"
    ADD CONSTRAINT "knowledge_fields_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."knowledge_subjects"
    ADD CONSTRAINT "knowledge_subjects_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."knowledge_topics"
    ADD CONSTRAINT "knowledge_topics_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."knowledge_trees"
    ADD CONSTRAINT "knowledge_trees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_orchestrator_configs"
    ADD CONSTRAINT "lab_orchestrator_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_objective_concepts"
    ADD CONSTRAINT "learning_objective_concepts_pkey" PRIMARY KEY ("lo_code", "concept_code");



ALTER TABLE ONLY "public"."learning_objectives"
    ADD CONSTRAINT "learning_objectives_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."orchestrator_executions"
    ADD CONSTRAINT "orchestrator_executions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orchestrator_phases"
    ADD CONSTRAINT "orchestrator_phases_orchestrator_id_order_index_key" UNIQUE ("orchestrator_id", "order_index");



ALTER TABLE ONLY "public"."orchestrator_phases"
    ADD CONSTRAINT "orchestrator_phases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orchestrator_steps"
    ADD CONSTRAINT "orchestrator_steps_phase_id_order_index_key" UNIQUE ("phase_id", "order_index");



ALTER TABLE ONLY "public"."orchestrator_steps"
    ADD CONSTRAINT "orchestrator_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orchestrators"
    ADD CONSTRAINT "orchestrators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."step_executions"
    ADD CONSTRAINT "step_executions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject_fields"
    ADD CONSTRAINT "subject_fields_pkey" PRIMARY KEY ("subject_code", "field_code");



ALTER TABLE ONLY "public"."system_prompt_history"
    ADD CONSTRAINT "system_prompt_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_prompt_overrides"
    ADD CONSTRAINT "system_prompt_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_batches"
    ADD CONSTRAINT "task_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_sync_barriers"
    ADD CONSTRAINT "task_sync_barriers_pkey" PRIMARY KEY ("sync_group_id");



ALTER TABLE ONLY "public"."topic_categories"
    ADD CONSTRAINT "topic_categories_pkey" PRIMARY KEY ("topic_code", "category_code");



ALTER TABLE ONLY "public"."topic_learning_objectives"
    ADD CONSTRAINT "topic_learning_objectives_pkey" PRIMARY KEY ("topic_code", "lo_code");



ALTER TABLE ONLY "public"."blueprint_presets"
    ADD CONSTRAINT "unique_blueprint" UNIQUE ("grade_code", "preset_key", "version");



ALTER TABLE ONLY "public"."curriculum_units"
    ADD CONSTRAINT "uq_curriculum_unit_module" UNIQUE ("curriculum_id", "unit_code", "module_code");



ALTER TABLE ONLY "public"."curriculum_modules"
    ADD CONSTRAINT "uq_unit_module_code" UNIQUE ("unit_id", "module_code");



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "uq_user_key_name" UNIQUE ("user_id", "key_name");



ALTER TABLE ONLY "public"."user_prompt_customizations"
    ADD CONSTRAINT "uq_user_prompt_key" UNIQUE ("user_id", "prompt_key");



ALTER TABLE ONLY "public"."curriculum_units_v2"
    ADD CONSTRAINT "uq_workspace_unit_code" UNIQUE ("workspace_id", "unit_code");



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_generated_resources"
    ADD CONSTRAINT "user_generated_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."user_prompt_customizations"
    ADD CONSTRAINT "user_prompt_customizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_saved_resources"
    ADD CONSTRAINT "user_saved_resources_pkey" PRIMARY KEY ("resource_id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_usage"
    ADD CONSTRAINT "user_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_usage"
    ADD CONSTRAINT "user_usage_user_id_month_key" UNIQUE ("user_id", "month");



ALTER TABLE ONLY "public"."workflow_edit_locks"
    ADD CONSTRAINT "workflow_edit_locks_pkey" PRIMARY KEY ("lock_id");



ALTER TABLE ONLY "public"."workflow_errors"
    ADD CONSTRAINT "workflow_errors_pkey" PRIMARY KEY ("error_id");



ALTER TABLE ONLY "public"."workflow_jobs"
    ADD CONSTRAINT "workflow_jobs_pkey" PRIMARY KEY ("job_id");



ALTER TABLE ONLY "public"."workflow_progress"
    ADD CONSTRAINT "workflow_progress_pkey" PRIMARY KEY ("progress_id");



ALTER TABLE ONLY "public"."workflow_registry"
    ADD CONSTRAINT "workflow_registry_n8n_workflow_id_key" UNIQUE ("n8n_workflow_id");



ALTER TABLE ONLY "public"."workflow_registry"
    ADD CONSTRAINT "workflow_registry_pkey" PRIMARY KEY ("registry_id");



ALTER TABLE ONLY "public"."workflow_resource_specs"
    ADD CONSTRAINT "workflow_resource_specs_pkey" PRIMARY KEY ("spec_id");



ALTER TABLE ONLY "public"."workflow_resources"
    ADD CONSTRAINT "workflow_resources_pkey" PRIMARY KEY ("resource_id");



ALTER TABLE ONLY "public"."workflow_syllabi"
    ADD CONSTRAINT "workflow_syllabi_pkey" PRIMARY KEY ("syllabus_id");



ALTER TABLE ONLY "public"."workflow_tasks"
    ADD CONSTRAINT "workflow_tasks_pkey" PRIMARY KEY ("task_id");



ALTER TABLE ONLY "public"."workflow_tasks"
    ADD CONSTRAINT "workflow_tasks_task_key_key" UNIQUE ("task_key");



ALTER TABLE ONLY "public"."workflow_versions"
    ADD CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("version_id");



CREATE INDEX "idx_ai_tasks_agent" ON "public"."ai_tasks" USING "btree" ("agent_id", "status") WHERE ("status" = 'plan'::"public"."ai_task_status");



CREATE INDEX "idx_ai_tasks_batch" ON "public"."ai_tasks" USING "btree" ("batch_id") WHERE ("batch_id" IS NOT NULL);



CREATE INDEX "idx_ai_tasks_batch_id" ON "public"."ai_tasks" USING "btree" ("batch_id");



CREATE INDEX "idx_ai_tasks_batch_status" ON "public"."ai_tasks" USING "btree" ("batch_id", "status");



CREATE INDEX "idx_ai_tasks_created" ON "public"."ai_tasks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_tasks_extra_gin" ON "public"."ai_tasks" USING "gin" ("extra");



CREATE INDEX "idx_ai_tasks_launch_id" ON "public"."ai_tasks" USING "btree" ("launch_id");



CREATE INDEX "idx_ai_tasks_lo_code" ON "public"."ai_tasks" USING "btree" ("lo_code");



CREATE INDEX "idx_ai_tasks_orch_execution" ON "public"."ai_tasks" USING "btree" ("orchestrator_execution_id");



CREATE INDEX "idx_ai_tasks_parent_id" ON "public"."ai_tasks" USING "btree" ("parent_task_id");



CREATE INDEX "idx_ai_tasks_priority" ON "public"."ai_tasks" USING "btree" ("test_mode" DESC, "batch_priority", "agent_id", "sequence");



CREATE INDEX "idx_ai_tasks_prompt_template" ON "public"."ai_tasks" USING "btree" ("prompt_template_id");



CREATE INDEX "idx_ai_tasks_requires_approval" ON "public"."ai_tasks" USING "btree" ("requires_approval") WHERE ("requires_approval" = true);



CREATE INDEX "idx_ai_tasks_root_task" ON "public"."ai_tasks" USING "btree" ("root_task_id");



CREATE INDEX "idx_ai_tasks_split_group" ON "public"."ai_tasks" USING "btree" ("split_group_id");



CREATE INDEX "idx_ai_tasks_stage_key" ON "public"."ai_tasks" USING "btree" ("stage_key");



CREATE INDEX "idx_ai_tasks_status" ON "public"."ai_tasks" USING "btree" ("status");



CREATE INDEX "idx_ai_tasks_step_id" ON "public"."ai_tasks" USING "btree" ("step_id");



CREATE INDEX "idx_ai_tasks_step_number" ON "public"."ai_tasks" USING "btree" ("step_number");



CREATE INDEX "idx_ai_tasks_user" ON "public"."ai_tasks" USING "btree" ("user_id");



CREATE INDEX "idx_blueprints_grade" ON "public"."blueprint_presets" USING "btree" ("grade_code");



CREATE INDEX "idx_blueprints_preset" ON "public"."blueprint_presets" USING "btree" ("preset_key");



CREATE INDEX "idx_celery_task_history_created_at" ON "public"."celery_task_history" USING "btree" ("created_at");



CREATE INDEX "idx_celery_task_history_state" ON "public"."celery_task_history" USING "btree" ("state");



CREATE INDEX "idx_celery_task_history_task_name" ON "public"."celery_task_history" USING "btree" ("task_name");



CREATE INDEX "idx_celery_task_history_worker" ON "public"."celery_task_history" USING "btree" ("worker");



CREATE INDEX "idx_curricula_code" ON "public"."curricula" USING "btree" ("code");



CREATE INDEX "idx_curriculum_lessons_code" ON "public"."curriculum_lessons" USING "btree" ("lesson_code");



CREATE INDEX "idx_curriculum_lessons_curriculum" ON "public"."curriculum_lessons" USING "btree" ("curriculum_id");



CREATE INDEX "idx_curriculum_lessons_unit" ON "public"."curriculum_lessons" USING "btree" ("unit_code");



CREATE INDEX "idx_curriculum_units_curriculum" ON "public"."curriculum_units" USING "btree" ("curriculum_id");



CREATE INDEX "idx_curriculum_units_unit_code" ON "public"."curriculum_units" USING "btree" ("unit_code");



CREATE INDEX "idx_executions_created_at" ON "public"."orchestrator_executions" USING "btree" ("created_at");



CREATE INDEX "idx_executions_orchestrator" ON "public"."orchestrator_executions" USING "btree" ("orchestrator_id");



CREATE INDEX "idx_executions_status" ON "public"."orchestrator_executions" USING "btree" ("status");



CREATE INDEX "idx_executions_user" ON "public"."orchestrator_executions" USING "btree" ("user_id");



CREATE INDEX "idx_lab_configs_created_at" ON "public"."lab_orchestrator_configs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lab_configs_name" ON "public"."lab_orchestrator_configs" USING "btree" ("name");



CREATE INDEX "idx_lo_type" ON "public"."learning_objectives" USING "btree" ("lo_type");



CREATE INDEX "idx_orchestrators_category" ON "public"."orchestrators" USING "btree" ("category");



CREATE INDEX "idx_orchestrators_created_by" ON "public"."orchestrators" USING "btree" ("created_by");



CREATE INDEX "idx_orchestrators_status" ON "public"."orchestrators" USING "btree" ("status");



CREATE INDEX "idx_parent_lo" ON "public"."learning_objectives" USING "btree" ("parent_lo_code");



CREATE INDEX "idx_phases_orchestrator" ON "public"."orchestrator_phases" USING "btree" ("orchestrator_id");



CREATE INDEX "idx_prompt_templates_active" ON "public"."prompt_templates" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_prompt_templates_next_stage" ON "public"."prompt_templates" USING "btree" ("next_stage_template_id");



CREATE INDEX "idx_prompt_templates_org" ON "public"."prompt_templates" USING "btree" ("organization_code");



CREATE INDEX "idx_prompt_templates_stage_config" ON "public"."prompt_templates" USING "gin" ("stage_config");



CREATE INDEX "idx_step_executions_execution" ON "public"."step_executions" USING "btree" ("execution_id");



CREATE INDEX "idx_step_executions_status" ON "public"."step_executions" USING "btree" ("status");



CREATE INDEX "idx_step_executions_step" ON "public"."step_executions" USING "btree" ("step_id");



CREATE INDEX "idx_steps_phase" ON "public"."orchestrator_steps" USING "btree" ("phase_id");



CREATE INDEX "idx_task_batches_config_id" ON "public"."task_batches" USING "btree" ("orchestrator_config_id");



CREATE INDEX "idx_task_batches_grade" ON "public"."task_batches" USING "btree" ("grade_code");



CREATE INDEX "idx_task_batches_launch_id" ON "public"."task_batches" USING "btree" ("launch_id");



CREATE INDEX "idx_task_batches_preset" ON "public"."task_batches" USING "btree" ("preset_key");



CREATE INDEX "idx_task_batches_status" ON "public"."task_batches" USING "btree" ("status");



CREATE INDEX "idx_task_batches_type" ON "public"."task_batches" USING "btree" ("batch_type");



CREATE INDEX "idx_task_sync_barriers_is_ready" ON "public"."task_sync_barriers" USING "btree" ("is_ready");



CREATE INDEX "idx_workflow_edit_locks_entity" ON "public"."workflow_edit_locks" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_workflow_edit_locks_expires_at" ON "public"."workflow_edit_locks" USING "btree" ("expires_at");



CREATE INDEX "idx_workflow_errors_created_at" ON "public"."workflow_errors" USING "btree" ("created_at");



CREATE INDEX "idx_workflow_errors_job_id" ON "public"."workflow_errors" USING "btree" ("job_id");



CREATE INDEX "idx_workflow_errors_phase" ON "public"."workflow_errors" USING "btree" ("phase");



CREATE INDEX "idx_workflow_jobs_created_at" ON "public"."workflow_jobs" USING "btree" ("created_at");



CREATE INDEX "idx_workflow_jobs_state" ON "public"."workflow_jobs" USING "btree" ("state");



CREATE INDEX "idx_workflow_jobs_user_email" ON "public"."workflow_jobs" USING "btree" ("user_email");



CREATE INDEX "idx_workflow_progress_job_id" ON "public"."workflow_progress" USING "btree" ("job_id");



CREATE INDEX "idx_workflow_progress_phase" ON "public"."workflow_progress" USING "btree" ("phase");



CREATE INDEX "idx_workflow_registry_active" ON "public"."workflow_registry" USING "btree" ("task_id", "is_active");



CREATE INDEX "idx_workflow_registry_task" ON "public"."workflow_registry" USING "btree" ("task_id");



CREATE INDEX "idx_workflow_resource_specs_job_id" ON "public"."workflow_resource_specs" USING "btree" ("job_id");



CREATE INDEX "idx_workflow_resource_specs_lo_codes" ON "public"."workflow_resource_specs" USING "gin" ("learning_objective_codes");



CREATE INDEX "idx_workflow_resource_specs_unit_index" ON "public"."workflow_resource_specs" USING "btree" ("unit_index");



CREATE INDEX "idx_workflow_resources_job_id" ON "public"."workflow_resources" USING "btree" ("job_id");



CREATE INDEX "idx_workflow_resources_lesson_id" ON "public"."workflow_resources" USING "btree" ("lesson_id");



CREATE INDEX "idx_workflow_resources_type" ON "public"."workflow_resources" USING "btree" ("resource_type");



CREATE INDEX "idx_workflow_syllabi_job_id" ON "public"."workflow_syllabi" USING "btree" ("job_id");



CREATE INDEX "idx_workflow_syllabi_unit_index" ON "public"."workflow_syllabi" USING "btree" ("unit_index");



CREATE INDEX "idx_workflow_versions_created_at" ON "public"."workflow_versions" USING "btree" ("created_at");



CREATE INDEX "idx_workflow_versions_entity" ON "public"."workflow_versions" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_workspaces_user" ON "public"."course_workspaces" USING "btree" ("user_id");



CREATE INDEX "ix_api_key_usage_log_success" ON "public"."api_key_usage_log" USING "btree" ("success");



CREATE INDEX "ix_api_key_usage_log_used_at" ON "public"."api_key_usage_log" USING "btree" ("used_at");



CREATE INDEX "ix_api_key_usage_log_user_api_key_id" ON "public"."api_key_usage_log" USING "btree" ("user_api_key_id");



CREATE INDEX "ix_system_prompt_history_prompt_key" ON "public"."system_prompt_history" USING "btree" ("prompt_key");



CREATE UNIQUE INDEX "ix_system_prompt_overrides_prompt_key" ON "public"."system_prompt_overrides" USING "btree" ("prompt_key");



CREATE INDEX "ix_user_api_keys_is_active" ON "public"."user_api_keys" USING "btree" ("is_active");



CREATE INDEX "ix_user_api_keys_user_id" ON "public"."user_api_keys" USING "btree" ("user_id");



CREATE INDEX "ix_user_profiles_email" ON "public"."user_profiles" USING "btree" ("email");



CREATE INDEX "ix_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."ai_model_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "tr_auto_hide_hub_asset" AFTER INSERT ON "public"."hub_reports" FOR EACH ROW EXECUTE FUNCTION "public"."handle_auto_hide_hub_asset"();



CREATE OR REPLACE TRIGGER "tr_sync_tier_to_profile" AFTER INSERT OR UPDATE OF "tier" ON "public"."user_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_tier_sync"();



CREATE OR REPLACE TRIGGER "trigger_update_batch_counters" AFTER INSERT OR UPDATE OF "status" ON "public"."ai_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_batch_counters"();



CREATE OR REPLACE TRIGGER "update_custom_components_updated_at" BEFORE UPDATE ON "public"."custom_components" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ai_model_settings"
    ADD CONSTRAINT "ai_model_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tasks"
    ADD CONSTRAINT "ai_tasks_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_tasks"
    ADD CONSTRAINT "ai_tasks_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."task_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tasks"
    ADD CONSTRAINT "ai_tasks_orchestrator_execution_id_fkey" FOREIGN KEY ("orchestrator_execution_id") REFERENCES "public"."orchestrator_executions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_tasks"
    ADD CONSTRAINT "ai_tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "public"."ai_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_tasks"
    ADD CONSTRAINT "ai_tasks_prompt_template_id_fkey" FOREIGN KEY ("prompt_template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_tasks"
    ADD CONSTRAINT "ai_tasks_root_task_id_fkey" FOREIGN KEY ("root_task_id") REFERENCES "public"."ai_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_tasks"
    ADD CONSTRAINT "ai_tasks_step_execution_id_fkey" FOREIGN KEY ("step_execution_id") REFERENCES "public"."step_executions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_tasks"
    ADD CONSTRAINT "ai_tasks_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."orchestrator_steps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_tasks"
    ADD CONSTRAINT "ai_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_key_health"
    ADD CONSTRAINT "api_key_health_user_api_key_id_fkey" FOREIGN KEY ("user_api_key_id") REFERENCES "public"."user_api_keys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_key_health"
    ADD CONSTRAINT "api_key_health_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_key_usage_log"
    ADD CONSTRAINT "api_key_usage_log_user_api_key_id_fkey" FOREIGN KEY ("user_api_key_id") REFERENCES "public"."user_api_keys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_key_usage_log"
    ADD CONSTRAINT "api_key_usage_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."batch_questions"
    ADD CONSTRAINT "batch_questions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_jobs"("id");



ALTER TABLE ONLY "public"."batch_questions"
    ADD CONSTRAINT "batch_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."category_subjects"
    ADD CONSTRAINT "category_subjects_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "public"."knowledge_categories"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_subjects"
    ADD CONSTRAINT "category_subjects_subject_code_fkey" FOREIGN KEY ("subject_code") REFERENCES "public"."knowledge_subjects"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."celery_task_history"
    ADD CONSTRAINT "celery_task_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_workspaces"
    ADD CONSTRAINT "course_workspaces_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id");



ALTER TABLE ONLY "public"."course_workspaces"
    ADD CONSTRAINT "course_workspaces_knowledge_tree_id_fkey" FOREIGN KEY ("knowledge_tree_id") REFERENCES "public"."knowledge_trees"("id");



ALTER TABLE ONLY "public"."course_workspaces"
    ADD CONSTRAINT "course_workspaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."curriculum_lessons"
    ADD CONSTRAINT "curriculum_lessons_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."curriculum_modules"
    ADD CONSTRAINT "curriculum_modules_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."curriculum_units_v2"("id");



ALTER TABLE ONLY "public"."curriculum_units"
    ADD CONSTRAINT "curriculum_units_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."curriculum_units_v2"
    ADD CONSTRAINT "curriculum_units_v2_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."course_workspaces"("id");



ALTER TABLE ONLY "public"."custom_components"
    ADD CONSTRAINT "custom_components_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."custom_components"
    ADD CONSTRAINT "custom_components_hub_asset_id_fkey" FOREIGN KEY ("hub_asset_id") REFERENCES "public"."hub_assets"("id");



ALTER TABLE ONLY "public"."workflow_jobs"
    ADD CONSTRAINT "fk_workflow_jobs_task_id" FOREIGN KEY ("task_id") REFERENCES "public"."workflow_tasks"("task_id");



ALTER TABLE ONLY "public"."hub_assets"
    ADD CONSTRAINT "hub_assets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hub_assets"
    ADD CONSTRAINT "hub_assets_parent_asset_id_fkey" FOREIGN KEY ("parent_asset_id") REFERENCES "public"."hub_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hub_assets"
    ADD CONSTRAINT "hub_assets_source_asset_id_fkey" FOREIGN KEY ("source_asset_id") REFERENCES "public"."hub_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hub_reports"
    ADD CONSTRAINT "hub_reports_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."hub_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hub_reports"
    ADD CONSTRAINT "hub_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hub_reports"
    ADD CONSTRAINT "hub_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hub_stars"
    ADD CONSTRAINT "hub_stars_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."hub_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hub_stars"
    ADD CONSTRAINT "hub_stars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_orchestrator_configs"
    ADD CONSTRAINT "lab_orchestrator_configs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_orchestrator_configs"
    ADD CONSTRAINT "lab_orchestrator_configs_hub_asset_id_fkey" FOREIGN KEY ("hub_asset_id") REFERENCES "public"."hub_assets"("id");



ALTER TABLE ONLY "public"."learning_objective_concepts"
    ADD CONSTRAINT "learning_objective_concepts_concept_code_fkey" FOREIGN KEY ("concept_code") REFERENCES "public"."concepts"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_objective_concepts"
    ADD CONSTRAINT "learning_objective_concepts_lo_code_fkey" FOREIGN KEY ("lo_code") REFERENCES "public"."learning_objectives"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_objectives"
    ADD CONSTRAINT "learning_objectives_parent_lo_code_fkey" FOREIGN KEY ("parent_lo_code") REFERENCES "public"."learning_objectives"("code") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orchestrator_executions"
    ADD CONSTRAINT "orchestrator_executions_current_phase_id_fkey" FOREIGN KEY ("current_phase_id") REFERENCES "public"."orchestrator_phases"("id");



ALTER TABLE ONLY "public"."orchestrator_executions"
    ADD CONSTRAINT "orchestrator_executions_current_step_id_fkey" FOREIGN KEY ("current_step_id") REFERENCES "public"."orchestrator_steps"("id");



ALTER TABLE ONLY "public"."orchestrator_executions"
    ADD CONSTRAINT "orchestrator_executions_orchestrator_id_fkey" FOREIGN KEY ("orchestrator_id") REFERENCES "public"."orchestrators"("id");



ALTER TABLE ONLY "public"."orchestrator_executions"
    ADD CONSTRAINT "orchestrator_executions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orchestrator_phases"
    ADD CONSTRAINT "orchestrator_phases_orchestrator_id_fkey" FOREIGN KEY ("orchestrator_id") REFERENCES "public"."orchestrators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orchestrator_steps"
    ADD CONSTRAINT "orchestrator_steps_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."orchestrator_phases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orchestrators"
    ADD CONSTRAINT "orchestrators_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orchestrators"
    ADD CONSTRAINT "orchestrators_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."orchestrators"("id");



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_custom_component_id_fkey" FOREIGN KEY ("custom_component_id") REFERENCES "public"."custom_components"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_hub_asset_id_fkey" FOREIGN KEY ("hub_asset_id") REFERENCES "public"."hub_assets"("id");



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_next_stage_fkey" FOREIGN KEY ("next_stage_template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."step_executions"
    ADD CONSTRAINT "step_executions_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."orchestrator_executions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."step_executions"
    ADD CONSTRAINT "step_executions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."orchestrator_steps"("id");



ALTER TABLE ONLY "public"."step_executions"
    ADD CONSTRAINT "step_executions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subject_fields"
    ADD CONSTRAINT "subject_fields_field_code_fkey" FOREIGN KEY ("field_code") REFERENCES "public"."knowledge_fields"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subject_fields"
    ADD CONSTRAINT "subject_fields_subject_code_fkey" FOREIGN KEY ("subject_code") REFERENCES "public"."knowledge_subjects"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_prompt_history"
    ADD CONSTRAINT "system_prompt_history_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."system_prompt_history"
    ADD CONSTRAINT "system_prompt_history_override_id_fkey" FOREIGN KEY ("override_id") REFERENCES "public"."system_prompt_overrides"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."system_prompt_overrides"
    ADD CONSTRAINT "system_prompt_overrides_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."task_batches"
    ADD CONSTRAINT "task_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_batches"
    ADD CONSTRAINT "task_batches_orchestrator_config_id_fkey" FOREIGN KEY ("orchestrator_config_id") REFERENCES "public"."lab_orchestrator_configs"("id");



ALTER TABLE ONLY "public"."topic_categories"
    ADD CONSTRAINT "topic_categories_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "public"."knowledge_categories"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_categories"
    ADD CONSTRAINT "topic_categories_topic_code_fkey" FOREIGN KEY ("topic_code") REFERENCES "public"."knowledge_topics"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_learning_objectives"
    ADD CONSTRAINT "topic_learning_objectives_lo_code_fkey" FOREIGN KEY ("lo_code") REFERENCES "public"."learning_objectives"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_learning_objectives"
    ADD CONSTRAINT "topic_learning_objectives_topic_code_fkey" FOREIGN KEY ("topic_code") REFERENCES "public"."knowledge_topics"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_generated_resources"
    ADD CONSTRAINT "user_generated_resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_prompt_customizations"
    ADD CONSTRAINT "user_prompt_customizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."user_saved_resources"
    ADD CONSTRAINT "user_saved_resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_usage"
    ADD CONSTRAINT "user_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_edit_locks"
    ADD CONSTRAINT "workflow_edit_locks_locked_by_id_fkey" FOREIGN KEY ("locked_by_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_errors"
    ADD CONSTRAINT "workflow_errors_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."workflow_jobs"("job_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_errors"
    ADD CONSTRAINT "workflow_errors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_jobs"
    ADD CONSTRAINT "workflow_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_progress"
    ADD CONSTRAINT "workflow_progress_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."workflow_jobs"("job_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_progress"
    ADD CONSTRAINT "workflow_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_registry"
    ADD CONSTRAINT "workflow_registry_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."workflow_tasks"("task_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_resource_specs"
    ADD CONSTRAINT "workflow_resource_specs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."workflow_jobs"("job_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_resource_specs"
    ADD CONSTRAINT "workflow_resource_specs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_resources"
    ADD CONSTRAINT "workflow_resources_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."workflow_jobs"("job_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_resources"
    ADD CONSTRAINT "workflow_resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_syllabi"
    ADD CONSTRAINT "workflow_syllabi_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."workflow_jobs"("job_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_syllabi"
    ADD CONSTRAINT "workflow_syllabi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_tasks"
    ADD CONSTRAINT "workflow_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_versions"
    ADD CONSTRAINT "workflow_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can view and update reports" ON "public"."hub_reports" USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("auth"."uid"() = "users"."id") AND (("users"."raw_app_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Admins view all batches" ON "public"."task_batches" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins view all executions" ON "public"."orchestrator_executions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins view all subscriptions" ON "public"."user_subscriptions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins view all tasks" ON "public"."ai_tasks" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins view all workflow jobs" ON "public"."workflow_jobs" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Authenticated users can create assets" ON "public"."hub_assets" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "Authenticated users can create batches" ON "public"."task_batches" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can create tasks" ON "public"."ai_tasks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can update batches" ON "public"."task_batches" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update tasks" ON "public"."ai_tasks" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all batches" ON "public"."task_batches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all tasks" ON "public"."ai_tasks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public assets are viewable by everyone" ON "public"."hub_assets" FOR SELECT USING ((("is_public" = true) AND ("is_hidden" = false)));



CREATE POLICY "ReadOnlyForAuth" ON "public"."blueprint_presets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."category_subjects" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."concepts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."curricula" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."curriculum_lessons" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."curriculum_modules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."curriculum_units" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."curriculum_units_v2" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."knowledge_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."knowledge_fields" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."knowledge_subjects" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."knowledge_topics" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."knowledge_trees" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."learning_objective_concepts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."learning_objectives" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."orchestrator_phases" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."orchestrator_steps" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."orchestrators" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."subject_fields" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."topic_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."topic_learning_objectives" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."workflow_registry" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ReadOnlyForAuth" ON "public"."workflow_tasks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Service role full access" ON "public"."ai_tasks" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access on batches" ON "public"."task_batches" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Stars are viewable by everyone" ON "public"."hub_stars" FOR SELECT USING (true);



CREATE POLICY "Users can create components" ON "public"."custom_components" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create configs" ON "public"."lab_orchestrator_configs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create own settings" ON "public"."ai_model_settings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create templates" ON "public"."prompt_templates" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create their own batches" ON "public"."task_batches" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create their own tasks" ON "public"."ai_tasks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own configs" ON "public"."lab_orchestrator_configs" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete own settings" ON "public"."ai_model_settings" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own templates" ON "public"."prompt_templates" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own batches" ON "public"."task_batches" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own components" ON "public"."custom_components" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own tasks" ON "public"."ai_tasks" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage customizations" ON "public"."user_prompt_customizations" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own API keys" ON "public"."user_api_keys" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own jobs" ON "public"."workflow_jobs" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own model settings" ON "public"."ai_model_settings" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own resources" ON "public"."user_generated_resources" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage saved resources" ON "public"."user_saved_resources" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own hub assets" ON "public"."hub_assets" USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "Users can manage their own stars" ON "public"."hub_stars" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage workspaces" ON "public"."course_workspaces" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can report assets" ON "public"."hub_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can update own configs" ON "public"."lab_orchestrator_configs" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own settings" ON "public"."ai_model_settings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own templates" ON "public"."prompt_templates" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own batches" ON "public"."task_batches" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own components" ON "public"."custom_components" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own tasks" ON "public"."ai_tasks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own executions" ON "public"."orchestrator_executions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own or public configs" ON "public"."lab_orchestrator_configs" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "created_by") OR ("is_public" = true) OR ("created_by" IS NULL)));



CREATE POLICY "Users can view own or public templates" ON "public"."prompt_templates" FOR SELECT TO "authenticated" USING ((("is_public" = true) OR ("created_by" = "auth"."uid"()) OR "public"."is_admin"() OR ("hub_asset_id" IS NOT NULL)));



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own settings or global defaults" ON "public"."ai_model_settings" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can view own subscription" ON "public"."user_subscriptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view public or their own components" ON "public"."custom_components" FOR SELECT TO "authenticated" USING ((("is_public" = true) OR ("auth"."uid"() = "created_by")));



CREATE POLICY "Users can view system default models" ON "public"."ai_model_settings" FOR SELECT TO "authenticated" USING (("user_id" IS NULL));



CREATE POLICY "Users can view their own batches or public batches" ON "public"."task_batches" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "created_by") OR ("is_public" = true)));



CREATE POLICY "Users can view their own tasks or tasks in public batches" ON "public"."ai_tasks" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."task_batches" "b"
  WHERE (("b"."id" = "ai_tasks"."batch_id") AND ("b"."is_public" = true))))));



CREATE POLICY "Users can view their own usage" ON "public"."user_usage" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "View own key health" ON "public"."api_key_health" FOR SELECT TO "authenticated" USING (("user_api_key_id" IN ( SELECT "user_api_keys"."id"
   FROM "public"."user_api_keys"
  WHERE ("user_api_keys"."user_id" = "auth"."uid"()))));



CREATE POLICY "View own key usage logs" ON "public"."api_key_usage_log" FOR SELECT TO "authenticated" USING (("user_api_key_id" IN ( SELECT "user_api_keys"."id"
   FROM "public"."user_api_keys"
  WHERE ("user_api_keys"."user_id" = "auth"."uid"()))));



CREATE POLICY "View own workflow artifacts" ON "public"."workflow_resources" FOR SELECT TO "authenticated" USING (("job_id" IN ( SELECT "workflow_jobs"."job_id"
   FROM "public"."workflow_jobs"
  WHERE ("workflow_jobs"."user_id" = "auth"."uid"()))));



CREATE POLICY "View own workflow errors" ON "public"."workflow_errors" FOR SELECT TO "authenticated" USING (("job_id" IN ( SELECT "workflow_jobs"."job_id"
   FROM "public"."workflow_jobs"
  WHERE ("workflow_jobs"."user_id" = "auth"."uid"()))));



CREATE POLICY "View own workflow progress" ON "public"."workflow_progress" FOR SELECT TO "authenticated" USING (("job_id" IN ( SELECT "workflow_jobs"."job_id"
   FROM "public"."workflow_jobs"
  WHERE ("workflow_jobs"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."ai_model_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alembic_version" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_key_health" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_key_usage_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."batch_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."batch_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blueprint_presets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category_subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."celery_task_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."concepts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_workspaces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curricula" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curriculum_lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curriculum_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curriculum_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curriculum_units_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hub_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hub_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hub_stars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_topics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_trees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_orchestrator_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_objective_concepts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_objectives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orchestrator_executions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orchestrator_phases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orchestrator_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orchestrators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prompt_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."step_executions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subject_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_prompt_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_prompt_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_sync_barriers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_learning_objectives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_generated_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_prompt_customizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_saved_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_edit_locks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_errors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_registry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_resource_specs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_syllabi" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_versions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ai_tasks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."task_batches";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."approve_task"("p_task_id" "uuid", "p_user_id" "uuid", "p_edited_output" "jsonb", "p_edit_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_task"("p_task_id" "uuid", "p_user_id" "uuid", "p_edited_output" "jsonb", "p_edit_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_task"("p_task_id" "uuid", "p_user_id" "uuid", "p_edited_output" "jsonb", "p_edit_notes" "text") TO "service_role";



GRANT ALL ON TABLE "public"."ai_tasks" TO "anon";
GRANT ALL ON TABLE "public"."ai_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tasks" TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_runnable_tasks"("batch_limit" integer, "max_processing" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_runnable_tasks"("batch_limit" integer, "max_processing" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_runnable_tasks"("batch_limit" integer, "max_processing" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_locks"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_locks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_locks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_next_stage_tasks"("p_parent_task_id" "uuid", "p_tasks" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_next_stage_tasks"("p_parent_task_id" "uuid", "p_tasks" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_next_stage_tasks"("p_parent_task_id" "uuid", "p_tasks" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_next_task_in_chain"("p_parent_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_next_task_in_chain"("p_parent_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_next_task_in_chain"("p_parent_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_star_count"("p_asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_star_count"("p_asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_star_count"("p_asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_batch_cascade"("p_batch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_batch_cascade"("p_batch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_batch_cascade"("p_batch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_batch_progress"("p_batch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_batch_progress"("p_batch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_batch_progress"("p_batch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_hierarchy_progress"("p_root_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_hierarchy_progress"("p_root_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hierarchy_progress"("p_root_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_tier"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_tier"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_tier"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_usage"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_usage"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_usage"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auth_user_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auto_hide_hub_asset"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auto_hide_hub_asset"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auto_hide_hub_asset"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_tier_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_tier_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_tier_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_finished_task"("p_batch_id" "uuid", "p_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_finished_task"("p_batch_id" "uuid", "p_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_finished_task"("p_batch_id" "uuid", "p_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_finished_task"("p_batch_id" "uuid", "p_task_id" "uuid", "p_output_result" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_finished_task"("p_batch_id" "uuid", "p_task_id" "uuid", "p_output_result" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_finished_task"("p_batch_id" "uuid", "p_task_id" "uuid", "p_output_result" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_star_count"("p_asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_star_count"("p_asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_star_count"("p_asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_sync_barrier"("p_sync_group_id" "uuid", "p_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_sync_barrier"("p_sync_group_id" "uuid", "p_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_sync_barrier"("p_sync_group_id" "uuid", "p_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_usage"("p_user_id" "uuid", "p_tasks" integer, "p_input_tokens" bigint, "p_output_tokens" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_usage"("p_user_id" "uuid", "p_tasks" integer, "p_input_tokens" bigint, "p_output_tokens" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_usage"("p_user_id" "uuid", "p_tasks" integer, "p_input_tokens" bigint, "p_output_tokens" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_zombie_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_zombie_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_zombie_tasks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regenerate_task"("p_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."regenerate_task"("p_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_task"("p_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_batch_to_pending"("p_batch_id" "uuid", "p_include_completed" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."reset_batch_to_pending"("p_batch_id" "uuid", "p_include_completed" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_batch_to_pending"("p_batch_id" "uuid", "p_include_completed" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_tasks_to_pending"("p_batch_id" "uuid", "p_status_filter" "text"[], "p_reset_retry_count" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."reset_tasks_to_pending"("p_batch_id" "uuid", "p_status_filter" "text"[], "p_reset_retry_count" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_tasks_to_pending"("p_batch_id" "uuid", "p_status_filter" "text"[], "p_reset_retry_count" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."retry_all_failed_in_batch"("p_batch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."retry_all_failed_in_batch"("p_batch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."retry_all_failed_in_batch"("p_batch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."retry_failed_task"("p_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."retry_failed_task"("p_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."retry_failed_task"("p_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_changes_to_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_changes_to_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_changes_to_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_batch_counters"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_batch_counters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_batch_counters"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."ai_model_settings" TO "anon";
GRANT ALL ON TABLE "public"."ai_model_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_model_settings" TO "service_role";



GRANT ALL ON TABLE "public"."prompt_templates" TO "anon";
GRANT ALL ON TABLE "public"."prompt_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt_templates" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tasks_with_template" TO "anon";
GRANT ALL ON TABLE "public"."ai_tasks_with_template" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tasks_with_template" TO "service_role";



GRANT ALL ON TABLE "public"."alembic_version" TO "anon";
GRANT ALL ON TABLE "public"."alembic_version" TO "authenticated";
GRANT ALL ON TABLE "public"."alembic_version" TO "service_role";



GRANT ALL ON TABLE "public"."api_key_health" TO "anon";
GRANT ALL ON TABLE "public"."api_key_health" TO "authenticated";
GRANT ALL ON TABLE "public"."api_key_health" TO "service_role";



GRANT ALL ON TABLE "public"."api_key_usage_log" TO "anon";
GRANT ALL ON TABLE "public"."api_key_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."api_key_usage_log" TO "service_role";



GRANT ALL ON TABLE "public"."batch_jobs" TO "anon";
GRANT ALL ON TABLE "public"."batch_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."batch_questions" TO "anon";
GRANT ALL ON TABLE "public"."batch_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_questions" TO "service_role";



GRANT ALL ON TABLE "public"."blueprint_presets" TO "anon";
GRANT ALL ON TABLE "public"."blueprint_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."blueprint_presets" TO "service_role";



GRANT ALL ON TABLE "public"."category_subjects" TO "anon";
GRANT ALL ON TABLE "public"."category_subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."category_subjects" TO "service_role";



GRANT ALL ON TABLE "public"."celery_task_history" TO "anon";
GRANT ALL ON TABLE "public"."celery_task_history" TO "authenticated";
GRANT ALL ON TABLE "public"."celery_task_history" TO "service_role";



GRANT ALL ON TABLE "public"."concepts" TO "anon";
GRANT ALL ON TABLE "public"."concepts" TO "authenticated";
GRANT ALL ON TABLE "public"."concepts" TO "service_role";



GRANT ALL ON TABLE "public"."course_workspaces" TO "anon";
GRANT ALL ON TABLE "public"."course_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."course_workspaces" TO "service_role";



GRANT ALL ON SEQUENCE "public"."course_workspaces_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."course_workspaces_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."course_workspaces_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."curricula" TO "anon";
GRANT ALL ON TABLE "public"."curricula" TO "authenticated";
GRANT ALL ON TABLE "public"."curricula" TO "service_role";



GRANT ALL ON SEQUENCE "public"."curricula_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."curricula_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."curricula_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_lessons" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_lessons" TO "service_role";



GRANT ALL ON SEQUENCE "public"."curriculum_lessons_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."curriculum_lessons_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."curriculum_lessons_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_modules" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_modules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."curriculum_modules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."curriculum_modules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."curriculum_modules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_units" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_units" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_units" TO "service_role";



GRANT ALL ON SEQUENCE "public"."curriculum_units_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."curriculum_units_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."curriculum_units_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_units_v2" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_units_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_units_v2" TO "service_role";



GRANT ALL ON SEQUENCE "public"."curriculum_units_v2_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."curriculum_units_v2_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."curriculum_units_v2_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."custom_components" TO "anon";
GRANT ALL ON TABLE "public"."custom_components" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_components" TO "service_role";



GRANT ALL ON TABLE "public"."hub_assets" TO "anon";
GRANT ALL ON TABLE "public"."hub_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."hub_assets" TO "service_role";



GRANT ALL ON TABLE "public"."hub_reports" TO "anon";
GRANT ALL ON TABLE "public"."hub_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."hub_reports" TO "service_role";



GRANT ALL ON TABLE "public"."hub_stars" TO "anon";
GRANT ALL ON TABLE "public"."hub_stars" TO "authenticated";
GRANT ALL ON TABLE "public"."hub_stars" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_categories" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_categories" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_fields" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_fields" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_subjects" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_subjects" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_topics" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_topics" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_trees" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_trees" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_trees" TO "service_role";



GRANT ALL ON SEQUENCE "public"."knowledge_trees_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."knowledge_trees_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."knowledge_trees_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."lab_orchestrator_configs" TO "anon";
GRANT ALL ON TABLE "public"."lab_orchestrator_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_orchestrator_configs" TO "service_role";



GRANT ALL ON TABLE "public"."learning_objective_concepts" TO "anon";
GRANT ALL ON TABLE "public"."learning_objective_concepts" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_objective_concepts" TO "service_role";



GRANT ALL ON TABLE "public"."learning_objectives" TO "anon";
GRANT ALL ON TABLE "public"."learning_objectives" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_objectives" TO "service_role";



GRANT ALL ON TABLE "public"."orchestrator_executions" TO "anon";
GRANT ALL ON TABLE "public"."orchestrator_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."orchestrator_executions" TO "service_role";



GRANT ALL ON TABLE "public"."orchestrator_phases" TO "anon";
GRANT ALL ON TABLE "public"."orchestrator_phases" TO "authenticated";
GRANT ALL ON TABLE "public"."orchestrator_phases" TO "service_role";



GRANT ALL ON TABLE "public"."orchestrator_steps" TO "anon";
GRANT ALL ON TABLE "public"."orchestrator_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."orchestrator_steps" TO "service_role";



GRANT ALL ON TABLE "public"."orchestrators" TO "anon";
GRANT ALL ON TABLE "public"."orchestrators" TO "authenticated";
GRANT ALL ON TABLE "public"."orchestrators" TO "service_role";



GRANT ALL ON TABLE "public"."step_executions" TO "anon";
GRANT ALL ON TABLE "public"."step_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."step_executions" TO "service_role";



GRANT ALL ON TABLE "public"."subject_fields" TO "anon";
GRANT ALL ON TABLE "public"."subject_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."subject_fields" TO "service_role";



GRANT ALL ON TABLE "public"."system_prompt_history" TO "anon";
GRANT ALL ON TABLE "public"."system_prompt_history" TO "authenticated";
GRANT ALL ON TABLE "public"."system_prompt_history" TO "service_role";



GRANT ALL ON TABLE "public"."system_prompt_overrides" TO "anon";
GRANT ALL ON TABLE "public"."system_prompt_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."system_prompt_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."task_batches" TO "anon";
GRANT ALL ON TABLE "public"."task_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."task_batches" TO "service_role";



GRANT ALL ON TABLE "public"."task_sync_barriers" TO "anon";
GRANT ALL ON TABLE "public"."task_sync_barriers" TO "authenticated";
GRANT ALL ON TABLE "public"."task_sync_barriers" TO "service_role";



GRANT ALL ON TABLE "public"."topic_categories" TO "anon";
GRANT ALL ON TABLE "public"."topic_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_categories" TO "service_role";



GRANT ALL ON TABLE "public"."topic_learning_objectives" TO "anon";
GRANT ALL ON TABLE "public"."topic_learning_objectives" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_learning_objectives" TO "service_role";



GRANT ALL ON TABLE "public"."user_api_keys" TO "anon";
GRANT ALL ON TABLE "public"."user_api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."user_api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."user_generated_resources" TO "anon";
GRANT ALL ON TABLE "public"."user_generated_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."user_generated_resources" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_prompt_customizations" TO "anon";
GRANT ALL ON TABLE "public"."user_prompt_customizations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_prompt_customizations" TO "service_role";



GRANT ALL ON TABLE "public"."user_saved_resources" TO "anon";
GRANT ALL ON TABLE "public"."user_saved_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."user_saved_resources" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_usage" TO "anon";
GRANT ALL ON TABLE "public"."user_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."user_usage" TO "service_role";



GRANT ALL ON TABLE "public"."v_failed_tasks_for_retry" TO "anon";
GRANT ALL ON TABLE "public"."v_failed_tasks_for_retry" TO "authenticated";
GRANT ALL ON TABLE "public"."v_failed_tasks_for_retry" TO "service_role";



GRANT ALL ON TABLE "public"."v_processing_tasks" TO "anon";
GRANT ALL ON TABLE "public"."v_processing_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."v_processing_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."v_runnable_tasks" TO "anon";
GRANT ALL ON TABLE "public"."v_runnable_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."v_runnable_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."v_stuck_tasks" TO "anon";
GRANT ALL ON TABLE "public"."v_stuck_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."v_stuck_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."v_tasks_awaiting_approval" TO "anon";
GRANT ALL ON TABLE "public"."v_tasks_awaiting_approval" TO "authenticated";
GRANT ALL ON TABLE "public"."v_tasks_awaiting_approval" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_edit_locks" TO "anon";
GRANT ALL ON TABLE "public"."workflow_edit_locks" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_edit_locks" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_errors" TO "anon";
GRANT ALL ON TABLE "public"."workflow_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_errors" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_jobs" TO "anon";
GRANT ALL ON TABLE "public"."workflow_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_progress" TO "anon";
GRANT ALL ON TABLE "public"."workflow_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_progress" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_registry" TO "anon";
GRANT ALL ON TABLE "public"."workflow_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_registry" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_resource_specs" TO "anon";
GRANT ALL ON TABLE "public"."workflow_resource_specs" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_resource_specs" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_resources" TO "anon";
GRANT ALL ON TABLE "public"."workflow_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_resources" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_syllabi" TO "anon";
GRANT ALL ON TABLE "public"."workflow_syllabi" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_syllabi" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_tasks" TO "anon";
GRANT ALL ON TABLE "public"."workflow_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_versions" TO "anon";
GRANT ALL ON TABLE "public"."workflow_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_versions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";































drop extension if exists "pg_net";

alter table "public"."orchestrator_executions" drop constraint "orchestrator_executions_status_check";

alter table "public"."orchestrator_phases" drop constraint "orchestrator_phases_on_error_check";

alter table "public"."orchestrators" drop constraint "orchestrators_status_check";

alter table "public"."step_executions" drop constraint "valid_step_execution_status";

alter table "public"."task_batches" drop constraint "task_batches_status_check";

alter table "public"."user_profiles" drop constraint "user_profiles_role_check";

alter table "public"."user_subscriptions" drop constraint "user_subscriptions_tier_check";

alter table "public"."workflow_edit_locks" drop constraint "valid_lock_entity_type";

alter table "public"."workflow_jobs" drop constraint "valid_state";

alter table "public"."workflow_resource_specs" drop constraint "valid_spec_status";

alter table "public"."workflow_resources" drop constraint "valid_resource_type";

alter table "public"."workflow_syllabi" drop constraint "valid_approach";

alter table "public"."workflow_syllabi" drop constraint "valid_status";

alter table "public"."workflow_versions" drop constraint "valid_entity_type";

alter table "public"."orchestrator_executions" add constraint "orchestrator_executions_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'awaiting_approval'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "public"."orchestrator_executions" validate constraint "orchestrator_executions_status_check";

alter table "public"."orchestrator_phases" add constraint "orchestrator_phases_on_error_check" CHECK (((on_error)::text = ANY ((ARRAY['stop'::character varying, 'skip'::character varying, 'fallback'::character varying])::text[]))) not valid;

alter table "public"."orchestrator_phases" validate constraint "orchestrator_phases_on_error_check";

alter table "public"."orchestrators" add constraint "orchestrators_status_check" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'archived'::character varying])::text[]))) not valid;

alter table "public"."orchestrators" validate constraint "orchestrators_status_check";

alter table "public"."step_executions" add constraint "valid_step_execution_status" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'skipped'::character varying, 'awaiting_approval'::character varying])::text[]))) not valid;

alter table "public"."step_executions" validate constraint "valid_step_execution_status";

alter table "public"."task_batches" add constraint "task_batches_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'paused'::character varying])::text[]))) not valid;

alter table "public"."task_batches" validate constraint "task_batches_status_check";

alter table "public"."user_profiles" add constraint "user_profiles_role_check" CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'superadmin'::character varying])::text[]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_role_check";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_tier_check" CHECK (((tier)::text = ANY ((ARRAY['free'::character varying, 'premium'::character varying])::text[]))) not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_tier_check";

alter table "public"."workflow_edit_locks" add constraint "valid_lock_entity_type" CHECK (((entity_type)::text = ANY ((ARRAY['syllabus'::character varying, 'resource_spec'::character varying])::text[]))) not valid;

alter table "public"."workflow_edit_locks" validate constraint "valid_lock_entity_type";

alter table "public"."workflow_jobs" add constraint "valid_state" CHECK (((state)::text = ANY ((ARRAY['init'::character varying, 'generating_syllabi'::character varying, 'awaiting_syllabus_review'::character varying, 'generating_resource_specs'::character varying, 'awaiting_resource_review'::character varying, 'generating_resources'::character varying, 'generating_guides'::character varying, 'packaging'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'paused_no_keys'::character varying])::text[]))) not valid;

alter table "public"."workflow_jobs" validate constraint "valid_state";

alter table "public"."workflow_resource_specs" add constraint "valid_spec_status" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'awaiting_review'::character varying, 'reviewed'::character varying, 'approved'::character varying])::text[]))) not valid;

alter table "public"."workflow_resource_specs" validate constraint "valid_spec_status";

alter table "public"."workflow_resources" add constraint "valid_resource_type" CHECK (((resource_type)::text = ANY ((ARRAY['lesson_plan'::character varying, 'activity'::character varying, 'question'::character varying, 'slide'::character varying, 'asset'::character varying, 'glossary'::character varying])::text[]))) not valid;

alter table "public"."workflow_resources" validate constraint "valid_resource_type";

alter table "public"."workflow_syllabi" add constraint "valid_approach" CHECK (((approach)::text = ANY ((ARRAY['PBL'::character varying, 'LbDP'::character varying])::text[]))) not valid;

alter table "public"."workflow_syllabi" validate constraint "valid_approach";

alter table "public"."workflow_syllabi" add constraint "valid_status" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'awaiting_review'::character varying, 'reviewed'::character varying, 'approved'::character varying])::text[]))) not valid;

alter table "public"."workflow_syllabi" validate constraint "valid_status";

alter table "public"."workflow_versions" add constraint "valid_entity_type" CHECK (((entity_type)::text = ANY ((ARRAY['syllabus'::character varying, 'resource_spec'::character varying])::text[]))) not valid;

alter table "public"."workflow_versions" validate constraint "valid_entity_type";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_sync AFTER INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();


  create policy "Users can delete own resources"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'course-assets'::text) AND ((storage.foldername(name))[1] = 'saved-resources'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));



  create policy "Users can read own resources"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'course-assets'::text) AND ((storage.foldername(name))[1] = 'saved-resources'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));



  create policy "Users can upload own resources"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'course-assets'::text) AND ((storage.foldername(name))[1] = 'saved-resources'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));



