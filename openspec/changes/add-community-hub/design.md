# Design: Community Hub

## Context

Orchable's Asset Library currently stores Prompt Templates, View Components, and AI Settings — all private to the user's workspace. There is no mechanism to share these with the broader community or discover others' work. The Hub introduces a public-facing layer on top of the existing asset model, treating all publishable assets uniformly under a central `hub_assets` registry.

The Hub is not a third-party marketplace — it is an integral part of the Orchable product, deeply linked to the existing Asset Library and Designer workflows.

## Goals

- Enable one-click publishing of any asset to a public Hub
- Enable one-click import (Use This) and Remix of any Hub asset into any workspace
- Track attribution automatically through the full remix chain
- Build moderation and safety tooling sufficient for a growing community
- Lay the schema foundation for future monetization without breaking Phase 1 simplicity

## Non-Goals (Phase 1)

- Paid/monetized assets — schema-ready but not activated
- Organization private Hubs — deferred to Phase 3
- Asset versioning — deferred to Phase 4
- Pre-moderation review — explicitly out of scope; report-based only

## Decisions

### 1. Central `hub_assets` Table

Rather than adding Hub metadata directly onto `prompt_templates`, `custom_components`, etc., we introduce a separate `hub_assets` table as the canonical registry. Each row points back to its source row via `ref_id` + `asset_type`. This:
- Keeps source tables clean and backward-compatible
- Allows Hub metadata to evolve independently
- Enables a single unified browse/search query across all asset types

### 2. Attribution via `source_asset_id` + `parent_asset_id`

Every remixed asset carries both:
- `source_asset_id` → always the root of the remix chain (immutable, even across multi-level remixes)
- `parent_asset_id` → direct parent in the remix chain

This enables both "show original" and "show remix tree" use cases without recursive queries for common cases.

### 3. Moderation: Report-Based, Auto-Hide

Pre-moderation would block community growth early on. Instead:
- Any authenticated user can report an asset
- `hub_reports` table stores all reports
- A Postgres trigger (or Edge Function) auto-sets `is_hidden = TRUE` when `COUNT(unresolved_reports) >= 5`
- Admin reviews via Supabase dashboard (Phase 1) or dedicated Admin UI (Phase 3+)

### 4. Auth Guard: Authenticated to Publish, Lite Can Import

Publishing requires accountability — anonymous Lite users cannot publish. However, Lite users **can import** (locally, into IndexedDB), since import is a read-only, low-risk operation. Export to JSON remains available for all. This mirrors Dify's model and avoids lock-in.

### 5. Monetization-Ready Schema from Day 1

`hub_assets` carries `license`, `price_cents`, and `stripe_product_id` from Phase 1, all defaulting to free. This avoids a costly schema migration when monetization goes live in Phase 4.

### 6. Sensitive Data Stripping

API keys, webhook authentication tokens, n8n private workflow IDs, and organization codes are **always** stripped server-side before the asset is stored in `hub_assets`. Client-side omission is never relied upon.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Malicious View Component code (XSS, data exfiltration) | Auto-scan on publish; sandbox iframe in Monitor |
| Low-quality spam flooding the Hub | Report-based auto-hide; spam is a report reason |
| Attribution chain broken by deletion | `source_asset_id` / `parent_asset_id` are preserved (not nulled) on deletion; UI shows "deleted asset" gracefully |
| Monetization schema complexity too early | All new fields are nullable / have defaults; zero UI surface for them in Phase 1 |

## Open Questions

- Should star count be public or private? (Recommendation: public — drives social proof)
- Should Hub content be indexed by search engines? (Recommendation: yes, for SEO / organic growth, but only `is_public = TRUE` assets)
