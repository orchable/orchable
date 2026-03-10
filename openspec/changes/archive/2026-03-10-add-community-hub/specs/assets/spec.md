# Capability: Assets

Specification for the Orchable Asset Library — Prompt Templates, View Components, and AI Settings Profiles.

---

## ADDED Requirements

### Requirement: Asset Hub Visibility

Assets in the Asset Library SHALL support a public visibility mode that publishes them to the Orchable Hub. The following asset types SHALL be eligible for Hub publishing: Prompt Templates, Custom View Components, and AI Settings Profiles.

#### Scenario: Asset marked as public
- **WHEN** an asset owner publishes an asset to the Hub via the Share Dialog
- **THEN** the asset's source record is linked via `hub_asset_id` to a new `hub_assets` row; the asset card in the Asset Library displays a "Public on Hub" badge

#### Scenario: Asset unpublished from Hub
- **WHEN** an asset owner removes their asset from the Hub
- **THEN** `hub_assets.is_public` is set to `FALSE`; the asset no longer appears in Hub browse pages but remains in the creator's Asset Library

### Requirement: Orchestration Config as an Asset

Orchestration Configs created in the Designer SHALL be treated as first-class assets in the Hub taxonomy. Configs SHALL support `tags`, `description`, and `is_public` fields, enabling discovery and import via the Hub.

#### Scenario: Share Orchestration from Designer
- **WHEN** a Designer user clicks "Share" on the Designer toolbar and completes the Share Dialog
- **THEN** the current orchestration config snapshot (stripped of sensitive data) is published as a `hub_assets` row with `asset_type = 'orchestration'`

#### Scenario: Bundle export
- **WHEN** a user selects "Publish Bundle" mode in the Share Dialog
- **THEN** all Prompt Templates linked to the orchestration's stages are included as embedded snapshots in the published Hub asset payload

### Requirement: Asset Import with Attribution

When an Asset Library asset is imported from the Hub (via "Use This" or "Remix"), the system SHALL record the attribution relationship on the cloned record.

#### Scenario: Attribution recorded on import
- **WHEN** a user imports a public template via "Use This"
- **THEN** the cloned `prompt_templates` row SHALL have `hub_asset_id` pointing to the imported `hub_assets` record, and the `source_asset_id` on the hub record tracks the original creator's asset
