# designer Specification

## Purpose
TBD - created by archiving change improve-designer-ux. Update Purpose after archive.
## Requirements
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

### Requirement: Asset Storage Synchronization
The UI layer SHALL use a unified `getAssetStorageAdapter()` for syncing AI Models, Prompt Templates, and UI Components across both the core Designer and the Hub.
- **Reason**: `IndexedDBAdapter` was incorrectly hardcoded for Free Users, resulting in desynchronized assets from `SupabaseAdapter` updates.

#### Scenario: Free user opens AI Models dropdown
- **WHEN** an authenticated user on the Free tier opens the AI Models list
- **THEN** the system fetches active models via `getAssetStorageAdapter()` which points to Supabase.
- **AND** the models are cached locally for offline execution.

### Requirement: Multidimensional Schema Editor
The Output Schema Editor SHALL support nesting `items` within an array root type, allowing for multidimensional arrays (e.g., `array of array`).

#### Scenario: User configures a grid output
- **WHEN** the user sets the Root Type to Array
- **AND** selects "Array" for the Item type
- **THEN** the editor reveals a nested Array Items Schema config for the child arrays.

### Requirement: Flexible Variable Scope Validation
The Prompt Editor SHALL highlight unregistered variables retrieved by Regex against the `availableScope` from the Parent Stage. However, it SHALL NOT treat missing variables as strictly invalid if Pre-Process hooks are enabled, recognizing that variables can be injected at runtime.

#### Scenario: User types a dynamic variable
- **WHEN** the user types `{{fetched_data}}` and it is not in the `availableScope`
- **AND** the stage has a Pre-Process Webhook with `output_handling: merge`
- **THEN** the variable is highlighted cautiously (e.g., Warning style) instead of strictly Invalid (Error style).

