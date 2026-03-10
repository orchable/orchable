## ADDED Requirements
### Requirement: Orchestration Creation
Users SHALL be able to clear the current designer canvas to start a new orchestration. The system MUST provide an explicit "New Orchestration" action. The system MUST warn the user before clearing the canvas if there are unsaved nodes or modifications.

#### Scenario: User starts a new orchestration with unsaved changes
- **WHEN** the user is modifying an orchestration and has added step nodes
- **AND** the user clicks "New Orchestration"
- **THEN** the system shows a confirmation dialog
- **AND** upon confirmation, the canvas is reset to a single Start Node.

#### Scenario: User starts a new orchestration on a blank canvas
- **WHEN** the canvas only contains the Start Node
- **AND** the user clicks "New Orchestration"
- **THEN** the canvas is reset immediately without a confirmation dialog.

### Requirement: Explicit Node Addition
The system SHALL provide intuitive methods for adding new operational stages (nodes) to the orchestration canvas. This MUST include a direct button click action that places a default node onto the canvas.

#### Scenario: User adds a generic node
- **WHEN** the user clicks the "Add Node" button in the palette
- **THEN** a new editable stage node is placed on the canvas below the last selected node or at the center.

### Requirement: Duplicate Orchestration
Users SHALL be able to duplicate an existing saved orchestration. The duplicate MUST be treated as a new, unsaved configuration. The system MUST provide a mechanism to automatically modify the `stage_key` of all duplicated stages using a user-provided suffix or prefix to maintain non-collision and readability.

#### Scenario: User duplicates an orchestration
- **WHEN** the user clicks "Duplicate" on a saved orchestration
- **AND** the user provides a new name and a stage key suffix (e.g., `_v2`)
- **THEN** the system generates a new canvas state with identical structure
- **AND** all step nodes have the suffix appended to their `stage_key`
- **AND** the configuration ID is cleared pending a save action.
