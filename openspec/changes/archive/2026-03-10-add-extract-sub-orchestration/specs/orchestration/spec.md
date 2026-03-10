## ADDED Requirements

### Requirement: Extract Sub-Orchestration from Selected Stages

The system SHALL allow users to select multiple connected stages on the designer canvas and extract them into a new sub-orchestration.

#### Scenario: Successfully extract connected stages

- **WHEN** the user selects 2 or more connected stage nodes on the designer canvas
- **AND** clicks the "Create Sub-Orchestration" button
- **AND** enters a name and stage key in the dialog
- **AND** confirms the extraction
- **THEN** a new orchestration is created with the selected stages
- **AND** the selected stages are replaced by a single sub-orchestration node in the parent orchestration
- **AND** all incoming edges to the selected stages are rewired to the sub-orchestration node
- **AND** all outgoing edges from the selected stages are rewired from the sub-orchestration node
- **AND** both the parent and child orchestrations are saved automatically

#### Scenario: Reject disconnected stage selection

- **WHEN** the user selects 2 or more stage nodes that do not form a connected subgraph
- **AND** clicks the "Create Sub-Orchestration" button
- **THEN** the system displays an error indicating the selection must be connected
- **AND** the extraction dialog is not opened

#### Scenario: Validate stage key uniqueness

- **WHEN** the user enters a stage key in the extraction dialog
- **AND** the key already exists in the parent orchestration
- **THEN** the system displays a validation error
- **AND** the "Extract & Save" button is disabled
