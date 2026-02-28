ALTER TABLE lab_orchestrator_configs ADD COLUMN IF NOT EXISTS execution_delay_seconds integer DEFAULT 0;
