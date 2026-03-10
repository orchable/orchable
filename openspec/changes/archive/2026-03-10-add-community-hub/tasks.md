# Tasks: Add Community Hub

## Phase 1 — Foundation (Templates & Components Sharing)

### 1. Database Migrations

- [x] 1.1 Create `hub_assets` table with full schema (type, ref_id, creator_id, slug, metadata, attribution fields, monetization fields, engagement counters).
- [x] 1.2 Create `hub_stars` table.
- [x] 1.3 Create `hub_reports` table.
- [x] 1.4 Add `hub_asset_id` column to `prompt_templates`.
- [x] 1.5 Add `hub_asset_id`, `is_public` columns to `custom_components`.
- [x] 1.6 Create Postgres trigger: auto-set `hub_assets.is_hidden = TRUE` when `hub_reports` unresolved count reaches 5.
- [x] 1.7 Add RLS policies for `hub_assets`, `hub_stars`, `hub_reports`.

### 2. Service Layer

- [x] 2.1 Create `src/services/hubService.ts` with:
  - `publishAsset(type, refId, metadata)` — validate, strip sensitive data, create hub_assets row
  - `importAsset(hubAssetId, mode: 'use' | 'remix')` — clone into workspace with attribution
  - `toggleStar(hubAssetId)` / `checkIfStarred(hubAssetId)` — star toggle with real-time count update
  - `reportAsset(hubAssetId, reason, details)`
  - `fetchHubAssets(type, filters)` — paginated browse with search/filter/sort
  - `fetchHubAssetBySlug(slug)` — single asset detail
  - `fetchCreatorProfile(userId)` — aggregate stats + asset list for profile pages
  - `fetchFeaturedAssets(limit)` — top curated assets by star count
  - `countRemixes(assetId)` — count child assets from `parent_asset_id`

### 3. Sharing UI (Asset Library)

- [x] 3.1 Add "Share to Hub" button on Template and Component cards in Asset Library.
- [x] 3.2 Build `ShareToHubDialog` component (title, description, tags, license fields).
- [x] 3.3 Auth guard in dialog — unauthenticated users see login CTA with redirect to `/login`.
- [x] 3.4 Show "Public on Hub" badge on cards that are already published (Components, Templates, AI Settings).

### 4. Hub Browse Pages (Phase 1 subset)

- [x] 4.1 Create `/hub` unified browse page (all types, search, category tabs, sort).
- [x] 4.2 Separate sub-routes `/hub/templates`, `/hub/components`, `/hub/orchestrations`, `/hub/ai-presets` (handled via `:category` in `HubBrowse`).
- [x] 4.3 Build reusable `AssetCard` component (type badge, star count, tags, Use This / Import buttons).
- [x] 4.4 Build `AssetDetail` page (`/hub/:type/:slug`) with attribution badge and Remix info.
- [x] 4.5 "Import" flow with toast confirmation and recursive dependency cloning.

---

## Phase 2 — Orchestration Sharing

- [x] 5.1 Add `hub_asset_id`, `is_public`, `tags`, `description` to `orchestrator_configs`.
- [x] 5.2 Add "Share" button to Designer toolbar.
- [x] 5.3 Build bundle packaging — embed linked templates as immutable snapshots (`content` JSONB column).
- [x] 5.4 Unified Hub browse page supports orchestrations with content preview (`/hub` + Orchestrations tab).
- [x] 5.5 Bundle import: restore all linked templates and components with attribution.

---

## Phase 3 — Community Engagement

- [x] 6.1 Star / Unstar UI on Hub asset cards and detail pages (with RPC functions `increment_star_count` / `decrement_star_count`).
- [x] 6.2 Report button + `ReportDialog` component with reason selection (`hub_reports` ingestion). Auto-hide trigger for ≥5 reports.
- [x] 6.3 Dedicated `/hub/ai-presets` route (handled via `:category` in `HubBrowse`).
- [x] 6.3 Attribution badge on remixed assets ("Remixed from community" on card, "Originality" section on detail page).
- [x] 6.4 "N remixes" counter on original asset pages — `countRemixes()` in `hubService`, displayed in "Popularity & Reach" card on `AssetDetail`.
- [x] 6.5 Creator profile pages (`/hub/creators/:userId`) with aggregate stats (stars, installs, asset count) and public asset grid.
- [x] 6.6 Hub landing page with Featured and Trending section — `fetchFeaturedAssets()` + curated section at top of `/hub` when no search/filter active.

---

## Phase 4 — Advanced (Optional/Roadmap)

- [ ] 7.1 Starter Kit / Bundle packaging UI (multi-asset bundles).
- [ ] 7.2 Asset versioning (publish new version, pin imported version).
- [ ] 7.3 Embed card HTML snippet generator.
- [ ] 7.4 JSON API endpoint (`GET /api/hub/:id`).
- [ ] 7.5 Stripe integration for paid assets.
- [ ] 7.6 Creator revenue dashboard.
