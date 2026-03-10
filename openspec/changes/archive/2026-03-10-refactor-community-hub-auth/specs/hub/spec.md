## MODIFIED Requirements
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

### Requirement: Asset Import (Use This / Remix)
The system SHALL allow any user (including Lite) to import a Hub asset into their workspace via "Use This" or "Remix" actions.
- The system MUST copy the asset from the Hub and save it to their Supabase storage when a Premium or Free Authenticated User imports an asset.
- The system MUST copy the asset from the Hub and save it entirely to their local IndexedDB storage when an Unauthenticated User imports an asset.

#### Scenario: Use This (Lite user)
- **WHEN** a Lite user clicks "Use This" on a Hub template
- **THEN** the system clones the template into the user's local IndexedDB workspace; `source_asset_id` is recorded on the cloned record; `install_count` on the Hub asset is incremented
