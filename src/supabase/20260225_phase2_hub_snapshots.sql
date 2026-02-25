-- Migration: Add content column to hub_assets for snapshots
-- Date: 2026-02-25

-- 1. Add content column to hub_assets
ALTER TABLE hub_assets ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}';

-- 2. Ensure lab_orchestrator_configs has required metadata for Phase 2
-- (This was in the previous migration but repeating IF NOT EXISTS for safety)
ALTER TABLE lab_orchestrator_configs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE lab_orchestrator_configs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE lab_orchestrator_configs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE lab_orchestrator_configs ADD COLUMN IF NOT EXISTS hub_asset_id UUID REFERENCES hub_assets(id);

-- 3. Update hub_assets check constraint for future expansion (optional but good practice)
-- ALTER TABLE hub_assets DROP CONSTRAINT hub_assets_asset_type_check;
-- ALTER TABLE hub_assets ADD CONSTRAINT hub_assets_asset_type_check CHECK (asset_type IN ('orchestration', 'template', 'component', 'ai_preset', 'bundle'));
