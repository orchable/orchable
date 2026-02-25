-- Migration: Add Community Hub Tables
-- Date: 2026-02-25

-- 1. Create hub_assets table
CREATE TABLE IF NOT EXISTS hub_assets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type        TEXT NOT NULL CHECK (asset_type IN ('orchestration', 'template', 'component', 'ai_preset')),
    ref_id            UUID NOT NULL,       -- Pointer to source table row
    creator_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    slug              TEXT UNIQUE NOT NULL, -- URL-safe identifier

    -- Metadata
    title             TEXT NOT NULL,
    description       TEXT,
    tags              TEXT[] DEFAULT '{}',
    thumbnail_url     TEXT,

    -- Source Attribution
    source_asset_id   UUID REFERENCES hub_assets(id) ON DELETE SET NULL,
    parent_asset_id   UUID REFERENCES hub_assets(id) ON DELETE SET NULL,
    remix_depth       INTEGER NOT NULL DEFAULT 0,

    -- Visibility & Status
    is_public         BOOLEAN NOT NULL DEFAULT FALSE,
    published_at      TIMESTAMPTZ,
    is_hidden         BOOLEAN NOT NULL DEFAULT FALSE, -- Soft-delete by moderation

    -- Monetization Readiness (Phase 4+)
    license           TEXT NOT NULL DEFAULT 'orchable-free',
    price_cents       INTEGER NOT NULL DEFAULT 0,
    stripe_product_id TEXT,

    -- Engagement
    install_count     INTEGER NOT NULL DEFAULT 0,
    star_count        INTEGER NOT NULL DEFAULT 0,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create hub_stars table
CREATE TABLE IF NOT EXISTS hub_stars (
    asset_id    UUID REFERENCES hub_assets(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    starred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (asset_id, user_id)
);

-- 3. Create hub_reports table
CREATE TABLE IF NOT EXISTS hub_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id    UUID REFERENCES hub_assets(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason      TEXT NOT NULL,
    details     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved    BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id)
);

-- 4. Update existing tables
-- prompt_templates
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS hub_asset_id UUID REFERENCES hub_assets(id);
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- custom_components
ALTER TABLE custom_components ADD COLUMN IF NOT EXISTS hub_asset_id UUID REFERENCES hub_assets(id);
-- is_public already exists, but ensure it's there
-- ALTER TABLE custom_components ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE; 

-- lab_orchestrator_configs
ALTER TABLE lab_orchestrator_configs ADD COLUMN IF NOT EXISTS hub_asset_id UUID REFERENCES hub_assets(id);
ALTER TABLE lab_orchestrator_configs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE lab_orchestrator_configs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE lab_orchestrator_configs ADD COLUMN IF NOT EXISTS description TEXT;

-- 5. Auto-hide rule (simplified for SQL deployment)
-- This logic would typically be in an Edge Function or Trigger.
-- For now, we'll create the trigger to auto-hide if reports count >= 5.

CREATE OR REPLACE FUNCTION handle_auto_hide_hub_asset()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM hub_reports WHERE asset_id = NEW.asset_id AND resolved = FALSE) >= 5 THEN
        UPDATE hub_assets SET is_hidden = TRUE WHERE id = NEW.asset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_auto_hide_hub_asset
AFTER INSERT ON hub_reports
FOR EACH ROW
EXECUTE FUNCTION handle_auto_hide_hub_asset();

-- 6. Enable RLS
ALTER TABLE hub_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_reports ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- hub_assets: Read public ones, all for creator
CREATE POLICY "Public assets are viewable by everyone" ON hub_assets
    FOR SELECT USING (is_public = TRUE AND is_hidden = FALSE);

CREATE POLICY "Users can manage their own hub assets" ON hub_assets
    FOR ALL USING (auth.uid() = creator_id);

-- hub_stars: Users can see all stars, manage their own
CREATE POLICY "Stars are viewable by everyone" ON hub_stars
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage their own stars" ON hub_stars
    FOR ALL USING (auth.uid() = user_id);

-- hub_reports: Only admins can read, users can insert
CREATE POLICY "Users can report assets" ON hub_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view and update reports" ON hub_reports
    FOR ALL USING (EXISTS (
        SELECT 1 FROM auth.users WHERE auth.uid() = id AND (raw_app_meta_data->>'role')::text = 'admin'
    ));
