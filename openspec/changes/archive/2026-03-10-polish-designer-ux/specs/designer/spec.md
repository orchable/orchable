## MODIFIED Requirements

### Requirement: Orchestration Creation
Users SHALL be able to clear the current designer canvas to start a new orchestration. The system MUST provide an explicit "New Orchestration" action. The system MUST warn the user before clearing the canvas if there are unsaved nodes or modifications. The system MUST also warn the user before loading a different configuration if the current canvas has unsaved changes.

#### Scenario: User starts a new orchestration with unsaved changes
- **WHEN** the user is modifying an orchestration and has added step nodes
- **AND** the user clicks "New Orchestration"
- **THEN** the system shows a confirmation dialog
- **AND** upon confirmation, the canvas is reset to a single Start Node.

#### Scenario: User starts a new orchestration on a blank canvas
- **WHEN** the canvas only contains the Start Node
- **AND** the user clicks "New Orchestration"
- **THEN** the canvas is reset immediately without a confirmation dialog.

#### Scenario: User loads a config from library with unsaved work
- **WHEN** the user has added or modified stages on the canvas
- **AND** the user clicks to load a different configuration from the Library or Recent Configs
- **THEN** the system shows a confirmation dialog warning about unsaved changes
- **AND** upon confirmation, the selected configuration is loaded.

## ADDED Requirements

### Requirement: Dirty State Indicator
The system SHALL visually indicate when the current canvas state differs from the last saved configuration. This indicator MUST be visible in the toolbar area.

#### Scenario: Canvas is modified after save
- **WHEN** the user modifies nodes or edges after saving
- **THEN** a visual indicator (e.g., `●` dot) appears next to the orchestration name in the toolbar.

#### Scenario: Canvas is saved
- **WHEN** the user saves the current orchestration
- **THEN** the dirty indicator disappears.

### Requirement: Node Context Menu
The system SHALL provide a right-click context menu on stage nodes with common actions including Configure, Duplicate, and Delete.

#### Scenario: User right-clicks a stage node
- **WHEN** the user right-clicks on a stage node on the canvas
- **THEN** a context menu appears with options: Configure, Duplicate, Delete
- **AND** each action performs the corresponding operation.

### Requirement: Keyboard Shortcuts
The system SHALL support keyboard shortcuts for common designer actions.

#### Scenario: User presses Ctrl+S to save
- **WHEN** the user presses `Ctrl+S` (or `Cmd+S` on macOS) while the designer is active
- **THEN** the Save Configuration dialog opens.

### Requirement: MiniMap Accuracy
The MiniMap SHALL accurately reflect the configured status of each node using distinct colors for configured vs unconfigured states.

#### Scenario: MiniMap reflects node states
- **WHEN** the designer canvas contains nodes in various states
- **THEN** the MiniMap displays configured nodes in blue, unconfigured nodes in gray, and the start node in green.
