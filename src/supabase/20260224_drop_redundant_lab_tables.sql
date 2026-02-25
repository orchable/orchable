-- Migration: Drop redundant lab tables
-- Description: lab_executions and lab_step_executions are legacy tables replaced by task_batches and ai_tasks.

-- 1. Drop lab_step_executions first due to FK constraint
DROP TABLE IF EXISTS public.lab_step_executions;

-- 2. Drop lab_executions
DROP TABLE IF EXISTS public.lab_executions;
