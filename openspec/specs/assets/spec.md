# assets Specification

## Purpose
TBD - created by archiving change add-component-registry. Update Purpose after archive.
## Requirements
### Requirement: Component Storage
The system SHALL store custom UI components as STANDALONE assets in a dedicated registry.

#### Scenario: Register New Component
- **WHEN** a developer submits a React component with valid TSX and mock data
- **THEN** the system SHALL save the component to the `custom_components` table with a unique ID

### Requirement: Template Reference
The system SHALL allow prompt templates to reference registered components instead of embedding code.

#### Scenario: Link Template to Registry Component
- **WHEN** an orchestrator configuration is saved with a `custom_component_id`
- **THEN** the system SHALL resolve this ID during task execution to render the corresponding UI

### Requirement: Standalone Refinement
The system SHALL provide a sandbox for editing components in isolation from active executions.

#### Scenario: Preview in Registry
- **WHEN** a component is edited in the Asset Library
- **THEN** it SHALL render a live preview using the associated mock data

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

