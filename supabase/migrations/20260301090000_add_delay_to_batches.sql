-- Add execution_delay_seconds to task_batches
ALTER TABLE task_batches ADD COLUMN IF NOT EXISTS execution_delay_seconds INTEGER DEFAULT 0;
