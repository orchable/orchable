-- Migration: Add Hub Engagement RPC Functions
-- Date: 2026-02-25

-- 1. Function to increment star count
CREATE OR REPLACE FUNCTION increment_star_count(p_asset_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE hub_assets
    SET star_count = star_count + 1,
        updated_at = now()
    WHERE id = p_asset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to decrement star count
CREATE OR REPLACE FUNCTION decrement_star_count(p_asset_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE hub_assets
    SET star_count = GREATEST(0, star_count - 1),
        updated_at = now()
    WHERE id = p_asset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
