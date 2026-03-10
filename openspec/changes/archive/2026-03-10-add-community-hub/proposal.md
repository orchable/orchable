# Change: Add Community Hub

## Why

Orchable currently has no mechanism for users to share, discover, or reuse AI pipeline assets (Orchestration Configs, Prompt Templates, View Components, AI Settings). Adding a Community Hub enables knowledge sharing, accelerates adoption, and builds a network effect around the platform.

## What Changes

- **[NEW]** `hub_assets` table — central registry for all published Hub items with attribution chain, monetization-ready fields, and engagement counters.
- **[NEW]** `hub_stars` table — tracks user stars on Hub assets.
- **[NEW]** `hub_reports` table — stores community moderation reports; auto-hide on ≥ 5 unresolved reports.
- **[MODIFY]** `prompt_templates` — add `hub_asset_id`, `is_public` columns.
- **[MODIFY]** `custom_components` — add `hub_asset_id`, `is_public` columns.
- **[MODIFY]** `orchestrator_configs` — add `hub_asset_id`, `is_public`, `tags`, `description` columns.
- **[NEW]** Hub browse pages: `/hub`, `/hub/templates`, `/hub/components`, `/hub/orchestrations`, `/hub/ai-presets`.
- **[NEW]** "Share to Hub" action on Asset Library cards and Designer toolbar.
- **[NEW]** "Use This" / "Remix" import action on Hub asset detail pages.
- **[NEW]** Attribution badge on remixed assets (tracks `source_asset_id` / `parent_asset_id`).
- **[NEW]** Report button with `hub_reports` ingestion and auto-hide trigger.
- **[NEW]** Creator profile pages (`/hub/creators/[username]`).
- **[MODIFY]** Auth guard — publishing to Hub requires authenticated account; Lite users can import only.

## Impact

- **Specs**: `specs/hub/spec.md` (new), `specs/assets/spec.md` (modified)
- **Code**: `src/pages/Hub.tsx` (new), `src/pages/AssetLibrary.tsx`, `src/services/hubService.ts` (new), `src/components/hub/` (new folder)
- **Database**: New tables + ALTER on existing tables; Postgres trigger for auto-hide rule
- **No breaking changes** to existing functionality
