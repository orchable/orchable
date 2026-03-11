# hub Specification

## Purpose
The Hub provides a centralized community registry for sharing, discovering, and importing orchestration assets. It enables collaborative automation by allowing users to publish their configurations and templates for others to use or remix, while maintaining an attribution chain.
## Requirements
### Requirement: Hub Asset Registry
The system SHALL maintain a `hub_assets` table as the central registry for all community-published assets. Each record SHALL contain: asset_type, ref_id (pointer to source table), creator_id, slug (URL-safe unique identifier), title, description, tags, thumbnail_url, license, price_cents, install_count, star_count, is_public, is_hidden, published_at, and attribution fields (source_asset_id, parent_asset_id, remix_depth).
- The system MUST fetch the complete asset definition (from Supabase or local storage) and push it to the remote hub_assets table when an Authenticated User publishes an asset from their library.
- The system MUST block the action when an Unauthenticated User attempts to publish an asset, as publishing requires a registered Discord/Email account to link the creator_id.

#### Scenario: Publish a Prompt Template (Success)
- **WHEN** an authenticated user clicks "Share to Hub" on a Prompt Template and submits the Share Dialog with valid metadata
- **THEN** the system creates a `hub_assets` row with `asset_type = 'template'`, `ref_id = template.id`, and `is_public = TRUE`; the asset becomes immediately discoverable on `/hub/templates`

#### Scenario: Unauthenticated publish attempt
- **WHEN** a Lite (unauthenticated) user triggers the "Share to Hub" action
- **THEN** the system displays a login prompt requiring an account to publish.

### Requirement: Hub Browse & Discovery
The system SHALL provide public browse pages for each asset type (`/hub/templates`, `/hub/components`, `/hub/orchestrations`, `/hub/ai-presets`) with full-text search, tag filtering, and sort options (newest, most installed, most starred).

#### Scenario: Search by tag
- **WHEN** a user filters the Templates Hub page by the tag `#education`
- **THEN** only assets whose `tags` array contains `education` are returned

#### Scenario: Individual asset detail
- **WHEN** a user navigates to `/hub/templates/[slug]`
- **THEN** the page shows the asset title, description, creator, usage stats, tag list, attribution chain, and "Use This" / "Remix" action buttons

---

### Requirement: Asset Import (Use This / Remix)
The system SHALL allow any user (including Lite) to import a Hub asset into their workspace via "Use This" or "Remix" actions.
- The system MUST copy the asset from the Hub and save it to their Supabase storage when a Premium or Free Authenticated User imports an asset.
- The system MUST copy the asset from the Hub and save it entirely to their local IndexedDB storage when an Unauthenticated User imports an asset.

#### Scenario: Use This (Lite user)
- **WHEN** a Lite user clicks "Use This" on a Hub template
- **THEN** the system clones the template into the user's local IndexedDB workspace; `source_asset_id` is recorded on the cloned record; `install_count` on the Hub asset is incremented

### Requirement: Attribution Chain
The system SHALL maintain an immutable attribution chain from every remixed asset back to its original source.

#### Scenario: Multi-level remix attribution
- **WHEN** user C remixes an asset that user B remixed from user A's original
- **THEN** C's asset SHALL have `parent_asset_id = B_hub_asset.id` and `source_asset_id = A_hub_asset.id` and `remix_depth = 2`

#### Scenario: Attribution survives original deletion
- **WHEN** user A deletes their published Hub asset after it has been remixed
- **THEN** downstream remix records retain their `source_asset_id` and `parent_asset_id` values; the UI displays "Remixed from a deleted asset" instead of a broken link

---

### Requirement: Community Stars
The system SHALL allow authenticated users to star Hub assets. Star counts SHALL be publicly visible on asset cards and detail pages.

#### Scenario: Star an asset
- **WHEN** an authenticated user clicks the star icon on a Hub asset
- **THEN** a record is inserted into `hub_stars(asset_id, user_id)` and `hub_assets.star_count` is incremented; subsequent clicks remove the star

---

### Requirement: Report-Based Moderation
The system SHALL allow authenticated users to report Hub assets for violations. Assets reaching a report threshold SHALL be automatically hidden from public discovery pending admin review.

#### Scenario: Report submission
- **WHEN** a user clicks "Report" on an asset and selects a reason (Spam, Inappropriate, Copyright, Malicious Code, Other)
- **THEN** a record is inserted into `hub_reports` and a confirmation toast is shown

#### Scenario: Auto-hide threshold
- **WHEN** a Hub asset accumulates 5 or more unresolved reports
- **THEN** the system sets `hub_assets.is_hidden = TRUE`; the asset no longer appears in browse pages or search results

---

### Requirement: Sensitive Data Stripping
The system SHALL strip the following fields from any asset payload before publishing to `hub_assets`: API keys, authentication tokens, webhook URLs containing authentication parameters, n8n workflow credentials, and organization codes.

#### Scenario: API key omission
- **WHEN** an Orchestration Config referencing a private n8n webhook with an auth token is published to the Hub
- **THEN** the published snapshot SHALL contain the webhook URL structure but NOT the auth token value

---

### Requirement: Monetization-Ready Schema
The system SHALL store `license`, `price_cents`, and `stripe_product_id` on all Hub assets from the initial implementation. Phase 1 assets SHALL default to `license = 'orchable-free'` and `price_cents = 0`. No paid asset UI SHALL be exposed in Phase 1.

#### Scenario: Default free asset
- **WHEN** any asset is published via the Phase 1 UI
- **THEN** `license` is set to `'orchable-free'` and `price_cents` is set to `0`

### Requirement: Orchestration Config Structural Validation
The system SHALL validate orchestration configurations against a canonical JSON Schema before they are persisted to the database or published to the Hub. The validation MUST check:
- All steps have required fields (`id`, `name`, `label`, `stage_key`, `task_type`, `cardinality`, `dependsOn`, `ai_settings`)
- The `dependsOn` graph forms a valid DAG (no cycles)
- All step IDs and stage keys are unique within the config
- Steps with `cardinality: "1:N"` have a non-empty `split_path`
- `ai_settings` includes a complete `generationConfig` with at least `temperature` and `maxOutputTokens`

#### Scenario: Valid orchestration config
- **WHEN** a developer runs the validation script on a well-formed orchestration JSON
- **THEN** the script reports PASS with zero errors and zero warnings

#### Scenario: Missing dependsOn on root step
- **WHEN** a step has no `dependsOn` field
- **THEN** the validation script reports a CRITICAL error: "step.{id}: missing required field 'dependsOn'"

#### Scenario: Cyclic dependency detected
- **WHEN** step_A depends on step_B and step_B depends on step_A
- **THEN** the validation script reports a CRITICAL error: "Cycle detected: step_A → step_B → step_A"

#### Scenario: SQL generation blocked on errors
- **WHEN** the validation script is run with `--sql` flag on a config with CRITICAL errors
- **THEN** the script prints all errors and exits with code 1 without generating SQL output

### Requirement: Defensive Config Loading
The Designer SHALL gracefully handle orchestration configs loaded from the database that have missing or malformed fields. Specifically, the `loadConfig()` function MUST treat missing `dependsOn` as an empty array rather than crashing.

#### Scenario: Load config with missing dependsOn
- **WHEN** the Designer loads a config from the database where a step has no `dependsOn` key
- **THEN** the step is rendered on the canvas with no incoming dependency edges (treated as a root node connected to Start)
- **AND** no JavaScript error is thrown

