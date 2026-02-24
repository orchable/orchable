-- Migration: Generalize task_batches and add Campaign support (launch_id)
-- Created: 2026-02-15

-- 1. Make IOSTEM specific columns nullable
ALTER TABLE public.task_batches ALTER COLUMN preset_key DROP NOT NULL;
ALTER TABLE public.task_batches ALTER COLUMN grade_code DROP NOT NULL;

-- 2. Add generic classification and context
ALTER TABLE public.task_batches ADD COLUMN IF NOT EXISTS batch_type VARCHAR(50) DEFAULT 'generic';
ALTER TABLE public.task_batches ADD COLUMN IF NOT EXISTS orchestrator_config_id UUID REFERENCES public.lab_orchestrator_configs(id);

-- 3. Add Campaign Support (launch_id)
-- Mapping: 1 Launch Session (Campaign) -> N Batches (Rows) -> M AI Tasks
ALTER TABLE public.task_batches ADD COLUMN IF NOT EXISTS launch_id UUID;
ALTER TABLE public.ai_tasks ADD COLUMN IF NOT EXISTS launch_id UUID;

-- 4. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_batches_type ON public.task_batches(batch_type);
CREATE INDEX IF NOT EXISTS idx_task_batches_config_id ON public.task_batches(orchestrator_config_id);
CREATE INDEX IF NOT EXISTS idx_task_batches_launch_id ON public.task_batches(launch_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_launch_id ON public.ai_tasks(launch_id);

-- 5. Update existing records if any
UPDATE public.task_batches SET batch_type = 'iostem' WHERE preset_key IS NOT NULL;
