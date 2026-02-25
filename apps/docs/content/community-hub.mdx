# 17 — Orchable Hub: Community Sharing

> **The Hub** is Orchable's community-driven platform for sharing, discovering, and remixing AI pipeline assets — including Orchestration Configs, Prompt Templates, View Components, and AI Settings Profiles.

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Asset Taxonomy](#2-asset-taxonomy)
3. [Hub Architecture](#3-hub-architecture)
4. [Database Schema](#4-database-schema)
5. [Sharing Workflows](#5-sharing-workflows)
6. [Remix & Attribution](#6-remix--attribution)
7. [Hub UI Structure](#7-hub-ui-structure)
8. [Moderation & Safety](#8-moderation--safety)
9. [Access Control](#9-access-control)
10. [Monetization Readiness](#10-monetization-readiness)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Design Decisions Log](#12-design-decisions-log)

---

## 1. Overview & Goals

### What is the Hub?

The Hub (`/hub`) is a curated, searchable gallery of assets authored by the Orchable community. It allows users to:

- **Discover** pre-built pipelines, templates, and components for common use cases
- **Import** assets into their own workspace with a single click
- **Remix** existing assets and build upon others' work with full attribution
- **Publish** their own assets to share with the community

### Inspiration & Benchmarks

| Platform | Sharing Mechanism | Key Takeaway |
|---|---|---|
| **Dify** | Marketplace — full Apps | 1-click clone with pre-configured settings |
| **Coze** | Bot Store + Plugin Store | Clear taxonomy, Fork with attribution |
| **n8n Cloud** | Template Gallery | Workflow previews, screenshots, tags |
| **Flowise** | JSON export + import via URL | Lightweight, no friction |

**Orchable Hub** combines these patterns into a unified asset gallery with deep Remix tracking.

---

## 2. Asset Taxonomy

All Hub-shareable items are unified under a single **Asset** concept. Each asset has a type, metadata, visibility, and attribution chain.

### Supported Asset Types

| Type | ID | Current Table | Shareable? |
|---|---|---|---|
| Orchestration Config | `orchestration` | `orchestrator_configs` | ✅ Phase 2 |
| Prompt Template | `template` | `prompt_templates` | ✅ Phase 1 |
| View Component | `component` | `custom_components` | ✅ Phase 1 |
| AI Settings Profile | `ai_preset` | `ai_model_settings` | ✅ Phase 1 |

### Asset Metadata (Common Fields)

Every Hub-published asset must carry:

| Field | Type | Description |
|---|---|---|
| `title` | `text` | Human-readable name |
| `description` | `text` | What this asset does, for whom |
| `tags` | `text[]` | Use-case and domain tags |
| `thumbnail_url` | `text?` | Auto-generated or user-uploaded |
| `license` | `text` | `orchable-free` / `cc0` / `cc-by` |
| `is_public` | `bool` | Public on Hub vs. private |
| `install_count` | `int` | Times imported by others |
| `star_count` | `int` | Community star rating |

### Suggested Tags (Non-exhaustive)

```
Use-case: #education #marketing #data-extraction #summarization #code-generation
           #content-creation #qa #translation #classification
Domain:   #healthcare #legal #ecommerce #research
Cardinality: #1to1 #1toN #batch
Model:    #gemini-2.0-flash #gemini-2.5-pro
```

---

## 3. Hub Architecture

### Route Structure

```
/hub                            ← Hub landing page (featured + trending)
/hub/orchestrations             ← Browse Orchestration Configs
/hub/orchestrations/[id]        ← View single orchestration
/hub/templates                  ← Browse Prompt Templates
/hub/templates/[id]             ← View single template
/hub/components                 ← Browse View Components
/hub/components/[id]            ← View single component
/hub/ai-presets                 ← Browse AI Settings Profiles
/hub/ai-presets/[id]            ← View single preset
/hub/creators/[username]        ← Creator public profile
```

### Permalink

Every published asset receives a stable permalink:

```
orchable.app/hub/[type]/[slug]
```

Where `slug` is auto-generated from the asset title (e.g., `multi-stage-seo-content-writer`).

### Browsing & Discovery

Every Hub section supports:

- **Full-text search** across title, description, tags
- **Filter by**: type, tags, model, cardinality, license, sort order
- **Sort by**: newest, most installed, most starred, recently updated
- **Featured** curated collection on the landing page

---

## 4. Database Schema

### 4a. `hub_assets` — Central Registry

```sql
CREATE TABLE hub_assets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type        TEXT NOT NULL CHECK (asset_type IN ('orchestration', 'template', 'component', 'ai_preset')),
    ref_id            UUID NOT NULL,       -- Foreign key to the source table row
    creator_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    slug              TEXT UNIQUE NOT NULL, -- URL-safe identifier

    -- Metadata
    title             TEXT NOT NULL,
    description       TEXT,
    tags              TEXT[] DEFAULT '{}',
    thumbnail_url     TEXT,

    -- Source Attribution
    source_asset_id   UUID REFERENCES hub_assets(id) ON DELETE SET NULL, -- Original Hub asset
    parent_asset_id   UUID REFERENCES hub_assets(id) ON DELETE SET NULL, -- Direct parent in remix chain
    remix_depth       INTEGER NOT NULL DEFAULT 0,

    -- Visibility & Status
    is_public         BOOLEAN NOT NULL DEFAULT FALSE,
    published_at      TIMESTAMPTZ,
    is_hidden         BOOLEAN NOT NULL DEFAULT FALSE, -- Soft-delete by moderation

    -- Monetization (Phase 4+)
    license           TEXT NOT NULL DEFAULT 'orchable-free',  -- 'cc0', 'cc-by', 'orchable-free', 'paid'
    price_cents       INTEGER NOT NULL DEFAULT 0,
    stripe_product_id TEXT,

    -- Engagement
    install_count     INTEGER NOT NULL DEFAULT 0,
    star_count        INTEGER NOT NULL DEFAULT 0,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4b. `hub_stars` — Community Stars

```sql
CREATE TABLE hub_stars (
    asset_id    UUID REFERENCES hub_assets(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    starred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (asset_id, user_id)
);
```

### 4c. `hub_reports` — Moderation Reports

```sql
CREATE TABLE hub_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id    UUID REFERENCES hub_assets(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason      TEXT NOT NULL,  -- 'spam', 'inappropriate', 'copyright', 'other'
    details     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved    BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id)
);
```

> **Auto-hide rule**: If an asset accumulates ≥ 5 unresolved reports, it is automatically soft-deleted (`is_hidden = TRUE`) pending admin review.

### 4d. Schema Additions to Existing Tables

The following columns are added to existing tables:

**`prompt_templates`**
```sql
ALTER TABLE prompt_templates ADD COLUMN hub_asset_id UUID REFERENCES hub_assets(id);
-- source_asset_id tracked via hub_assets table
```

**`custom_components`**
```sql
ALTER TABLE custom_components ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE custom_components ADD COLUMN hub_asset_id UUID REFERENCES hub_assets(id);
```

**`orchestrator_configs`**
```sql
ALTER TABLE orchestrator_configs ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE orchestrator_configs ADD COLUMN hub_asset_id UUID REFERENCES hub_assets(id);
ALTER TABLE orchestrator_configs ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE orchestrator_configs ADD COLUMN description TEXT;
```

---

## 5. Sharing Workflows

### 5a. Publishing a Prompt Template (from Asset Library)

1. User clicks **"Share to Hub"** on a template card → Share Dialog opens
2. Dialog form:
   - **Title** (pre-filled from template name)
   - **Description** (freetext, required)
   - **Tags** (multi-select with suggestions)
   - **License** (dropdown: `orchable-free` / `cc0` / `cc-by`)
   - **Preview** of the template text (read-only)
3. User clicks **"Publish"**
4. System:
   - Validates user is authenticated (redirect to `/login` if not)
   - Creates `hub_assets` row with `asset_type = 'template'` and `ref_id = template.id`
   - Sets `is_public = TRUE` and `published_at = now()`
   - Generates URL slug from title
5. Asset appears on Hub at `/hub/templates/[slug]`

### 5b. Publishing an Orchestration Config (from Designer)

1. User opens the **"Share"** dropdown on the Designer toolbar
2. Share Dialog offers additional options:
   - **"Publish Pipeline Only"** — copies the config graph (nodes, edges, stage configs) without bundling templates
   - **"Publish Bundle"** — includes all linked Prompt Templates as embedded snapshots (recommended)
3. System creates a **snapshot** of the config at publish time (immutable version)
4. If "bundle" mode, linked prompt templates are embedded as `hub_bundle_items` (sub-assets)

> [!NOTE]
> API Keys, n8n webhook URLs, and any sensitive credentials are **always stripped** before publishing. The published artifact contains only the structural and semantic configuration.

### 5c. Publishing a View Component

1. User clicks **"Share to Hub"** on a component card
2. System runs a lightweight safety scan (checks for obvious XSS patterns, `eval`, `fetch`, etc.)
3. If scan passes → publish flow proceeds (same as template)
4. If scan flags issues → user is warned; publish requires manual override

### 5d. Publishing an AI Settings Profile

1. User clicks **"Share"** on an AI preset in Asset Library → AI Settings tab
2. Published preset includes: model_id, temperature, topP, topK, maxOutputTokens, thinkingLevel/Budget, generate_content_api
3. Does **not** include: API keys, organization codes, pricing info

### 5e. Batch Bundle Export

A **"Starter Kit"** bundles:
- 1 Orchestration Config
- N Prompt Templates
- M View Components
- Optional: AI Settings Profiles

Users import the entire kit in one action. The system creates local copies of all sub-assets and links their `source_asset_id` back to the Hub record.

---

## 6. Remix & Attribution

### 6a. "Use This" vs. "Remix"

| Action | Behavior |
|---|---|
| **Use This** | Import a clean copy. Asset is ready to use. `source_asset_id` is set. |
| **Remix** | Import + open editor immediately. `parent_asset_id` is set. Attribution badge shown. |

### 6b. Attribution Chain

Every remixed asset tracks its lineage:

```
Original Asset (remix_depth: 0)
  └── First Remix (remix_depth: 1, parent_asset_id = Original.id)
        └── Second Remix (remix_depth: 2, parent_asset_id = FirstRemix.id)
```

`source_asset_id` always points to the **root** of the chain (the original), regardless of depth.

### 6c. Attribution UI

- On every remixed asset card/page: **"Remixed from [Creator Avatar] [Asset Name]"** badge
- Click badge → navigates to the original Hub page (or shows "Original no longer available" if deleted)
- On the original asset's Hub page: **"[N] remixes"** counter + optional list of public remixes

### 6d. Asset Deletion & Attribution Stability

If the original creator deletes their Hub listing:
- `source_asset_id` and `parent_asset_id` remain pointing to the deleted record (they are not nulled)
- The attribution UI gracefully shows: *"Remixed from a deleted asset by [author if still visible]"*
- All downstream remixes **continue to function** — deletion only affects Hub discoverability

### 6e. License Enforcement

| License | What remixers can do | Attribution required? |
|---|---|---|
| `cc0` | Any use, including commercial | No |
| `cc-by` | Any use, including commercial | Yes — must credit creator |
| `orchable-free` | Use within Orchable only, no resale | No (but attribution shown) |
| `paid` *(Phase 4+)* | Use only after purchase | Yes |

---

## 7. Hub UI Structure

### 7a. Hub Landing Page (`/hub`)

```
Header: [Search Bar] [Filter by Type] [Sort]
──────────────────────────────────────────
Featured                    [See all →]
  [Card] [Card] [Card]

Trending This Week          [See all →]
  [Card] [Card] [Card] [Card]

Browse by Category
  [Orchestrations] [Templates] [Components] [AI Presets]
```

### 7b. Asset Card

```
┌────────────────────────────────────┐
│ [Thumbnail / Pipeline Preview]      │
│                                    │
│  📌 Multi-Stage SEO Writer         │
│  by @tonypham · 142 installs · ⭐ 28 │
│                                    │
│  [#education] [#1to1] [gemini-2.0] │
│                                    │
│  [Use This]  [Preview]  [⋯]        │
└────────────────────────────────────┘
```

### 7c. Asset Detail Page

```
[Back to Hub]
──────────────────────────────────────
[Large Thumbnail / Pipeline Diagram]

TITLE — By @creator_name
[⭐ 28 stars]  [142 installs]  [Remixed 7 times]

[Use This]  [Remix]  [Report]

DESCRIPTION
──────────
...

DETAILS
──────
Type:        Orchestration Config
License:     orchable-free
Stages:      5
Model:       gemini-2.0-flash
Tags:        #education #summarization

LINKED TEMPLATES (if bundle)
─────────────────────────────
  • Stage A: Extract Key Points
  • Stage B: Summarize Section
  ...

REMIXES (public)
─────────────────
  @user1 — translated to Spanish variant (⭐ 4)
  @user2 — added Stage F: export to PDF (⭐ 11)
```

### 7d. Creator Profile (`/hub/creators/[username]`)

```
[Avatar] Username  ·  Member since Feb 2026
[12 published assets]  [234 total installs]  [⭐ 89 total stars]

ASSETS BY THIS CREATOR
──────────────────────
[Card] [Card] [Card] ...
```

---

## 8. Moderation & Safety

### 8a. Model

Orchable Hub uses a **report-based moderation** model (no pre-review):

1. Any user can click **"Report"** on any Hub asset
2. Report reasons: `Spam`, `Inappropriate Content`, `Copyright Violation`, `Malicious Code`, `Other`
3. Reports are stored in `hub_reports`
4. **Auto-hide**: If ≥ 5 unresolved reports on any single asset → soft-deleted (`is_hidden = TRUE`) pending admin review
5. Admin reviews via Supabase dashboard (Phase 1) or dedicated Admin UI (Phase 3+)
6. Admin actions: `Restore`, `Permanently Delete`, `Ban Creator`

### 8b. Code Safety (View Components)

Since View Components contain executable TSX code, additional checks apply:

**Automated scan** flags:
- `eval()` or `Function()` calls
- `window.location` redirects
- `fetch` / `XMLHttpRequest` to external URLs
- Dynamic `<script>` injection

Outcomes:
- **Pass** → publish proceeds immediately
- **Flagged** → user sees warning + must confirm before publishing

All component code runs in a sandboxed iframe in the Monitor page, limiting blast radius of any malicious code that slips through.

### 8c. Sensitive Data Stripping

Before any asset is published, the system automatically strips:
- API keys and tokens
- Webhook URLs containing authentication tokens
- n8n workflow IDs linked to private credentials
- `organization_code` from AI model settings

---

## 9. Access Control

### 9a. Permission Matrix

| Action | Lite (no login) | Authenticated (Free Cloud/Pro) |
|---|---|---|
| Browse Hub | ✅ | ✅ |
| Preview assets | ✅ | ✅ |
| Import (Use This) | ✅ (local only) | ✅ (synced to cloud) |
| Remix | ✅ (local only) | ✅ |
| Star an asset | ❌ | ✅ |
| Report an asset | ❌ | ✅ |
| Publish to Hub | ❌ | ✅ |
| Edit published asset | ❌ | ✅ (creator only) |
| Delete published asset | ❌ | ✅ (creator only) |
| Admin: review reports | ❌ | ✅ (admin role only) |

> [!IMPORTANT]
> **Export to JSON** remains available to **all users** including Lite — this is the escape hatch to share assets outside the Hub without an account.

### 9b. Authentication Guard

```typescript
// In Hub publish action
const { user } = useAuth();

if (!user) {
    toast.info('Sign in to publish to the Hub');
    navigate('/login', { state: { returnTo: '/hub' } });
    return;
}
```

---

## 10. Monetization Readiness

Phase 1–3 of the Hub is entirely **free**. However, the schema and architecture are designed to support paid assets in Phase 4+.

### Schema Readiness

```sql
hub_assets.license         -- 'paid' when monetized
hub_assets.price_cents     -- 0 for free, e.g. 500 = $5.00
hub_assets.stripe_product_id -- NULL until Stripe integration live
```

### Future Flow (Phase 4+)

1. Creator sets `license = 'paid'` and `price_cents = 500` when publishing
2. Viewer sees **"$5.00 — Buy to Use"** on the asset page
3. Checkout via Stripe Checkout → on success, creates `hub_purchases(user_id, asset_id, purchased_at)`
4. "Use This" button unlocks; `install_count` increments
5. Creator receives revenue share via Stripe Connect

### Creator Revenue Share (Placeholder)

| Tier | Orchable Cut | Creator Cut |
|---|---|---|
| Standard | 30% | 70% |
| Verified Creator | 20% | 80% |

> *These percentages are placeholders and will be confirmed before Phase 4 launch.*

---

## 11. Implementation Roadmap

### Phase 1 — Foundation (Months 1–2)

**Goal**: Enable sharing of Prompt Templates and View Components.

**DB Migrations**:
- [ ] Create `hub_assets` table
- [ ] Create `hub_stars` table
- [ ] Create `hub_reports` table
- [ ] Add `hub_asset_id` to `prompt_templates`, `custom_components`
- [ ] Add `is_public` to `custom_components`

**Frontend**:
- [ ] "Share to Hub" button on Asset Library cards (Templates + Components tabs)
- [ ] Share Dialog with title, description, tags, license
- [ ] Basic `/hub/templates` browse page (list, search, filter by tags)
- [ ] Basic `/hub/components` browse page
- [ ] Single asset detail page with "Use This" button
- [ ] Attribution badge on remixed assets

**Backend**:
- [ ] `POST /api/hub/publish` — validate, strip sensitive data, create `hub_assets` row
- [ ] `POST /api/hub/import/:id` — clone asset into user's workspace with attribution

---

### Phase 2 — Orchestration Sharing (Months 2–3)

**Goal**: Enable sharing of full pipeline configs as Hub assets.

- [ ] DB: Add `hub_asset_id`, `tags`, `is_public`, `description` to `orchestrator_configs`
- [ ] Designer: "Share" button on toolbar → Share Dialog with bundle option
- [ ] Bundle logic: embed linked templates as snapshots in the hub asset JSON
- [ ] Hub: `/hub/orchestrations` browse page with pipeline diagram preview
- [ ] Studio Importer: import bundle and restore all linked assets

---

### Phase 3 — Community Features (Months 3–5)

**Goal**: Build community engagement and discovery.

- [ ] Star / Unstar assets
- [ ] Remix tracking UI (attribution badge + "N remixes" counter)
- [ ] Creator profiles (`/hub/creators/[username]`)
- [ ] Report button + `hub_reports` ingestion
- [ ] Auto-hide on ≥ 5 reports (Postgres trigger or Edge Function)
- [ ] Admin review panel (Supabase or simple internal page)
- [ ] Hub landing page with Featured + Trending sections
- [ ] AI Presets browse page

---

### Phase 4 — Advanced & Monetization (Months 5+)

- [ ] Starter Kit / Bundle packaging UI
- [ ] Organization private Hub (org-only visibility mode)
- [ ] Asset versioning (publish new versions, pin imported version)
- [ ] Embed card HTML snippet
- [ ] JSON API (`GET /api/hub/:id`)
- [ ] Stripe integration for paid assets
- [ ] Creator revenue dashboard

---

## 12. Design Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| **Moderation model** | Report-based, no pre-review | Reduces friction at launch; report threshold auto-hides abuse |
| **Who can publish?** | Authenticated users only (not Lite) | Publishing to a shared community requires account accountability |
| **Lite user import?** | Yes — imports to local IndexedDB | Import is read-only and low-risk; promotes discovery |
| **Export JSON available?** | Yes, for all users | Preserves user freedom; prevents platform lock-in |
| **Monetization** | Schema-ready now, activate in Phase 4 | Avoids costly migrations later; keeps Phase 1 simple for users |
| **Name** | "Hub" | Neutral; implies central place without implying commerce |
| **Attribution** | Permanent chain via `source_asset_id` + `parent_asset_id` | Survives deletion; gives clear lineage tracking |
| **Sensitive data** | Always stripped server-side before publish | Security baseline; never rely on client-side omission |
| **Component safety** | Automated scan + sandboxed iframe | Catches obvious threats; sandbox limits damage of edge cases |

---

*Last updated: 2026-02-25*
