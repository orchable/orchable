# Capability: Asset Registry

## Description
Provides a centralized repository for managing reusable prompt templates and visualization components.

## ADDED Requirements

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
