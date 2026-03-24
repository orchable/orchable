## ADDED Requirements

### Requirement: Edge-Level Cardinality Configuration
The Designer SHALL allow users to configure cardinality and routing parameters (`split_path`, `split_mode`, `merge_path`, `batch_grouping`, `output_mapping`) on individual edges between stages. Clicking an edge SHALL open an Edge Config Panel in the right sidebar. A visual label SHALL display the cardinality type on each edge in the canvas.

#### Scenario: User configures a 1:N edge
- **WHEN** the user clicks on an edge connecting Stage A to Stage B
- **THEN** the Edge Config Panel opens in the right sidebar
- **AND** the user selects cardinality `1:N` and sets `split_path` to `result.questions`
- **THEN** the edge in the canvas displays a `1:N` label
- **AND** the configuration is persisted when the orchestration is saved.

#### Scenario: Default edge cardinality
- **WHEN** the user draws a new edge between two stages
- **THEN** the edge is created with default cardinality `1:1`
- **AND** no further configuration is required for basic pass-through behavior.

#### Scenario: Mixed cardinality on outgoing edges
- **WHEN** Stage A has two outgoing edges: A→B configured as `1:N` and A→C configured as `1:1`
- **THEN** both edges display their respective cardinality labels
- **AND** the orchestration is valid and can be saved.

### Requirement: Edge Config Persistence
The Designer SHALL persist edge configurations (including `EdgeConfig`) as part of the `OrchestratorConfig.edges[]` array. Save, Load, Import, and Export operations MUST roundtrip edge configs without data loss.

#### Scenario: Save and reload preserves edge configs
- **WHEN** the user configures edges with various cardinality settings and saves
- **AND** reloads the orchestration from the config library
- **THEN** all edge configs are restored exactly as configured.

#### Scenario: Export and import preserves edge configs
- **WHEN** the user exports an orchestration with configured edges as JSON
- **AND** imports the JSON into a new orchestration
- **THEN** all edge configs are preserved in the imported state.

## MODIFIED Requirements

### Requirement: Orchestration Creation
Users SHALL be able to clear the current designer canvas to start a new orchestration. The system MUST provide an explicit "New Orchestration" action. The system MUST warn the user before clearing the canvas if there are unsaved nodes, edges, or modifications. The system MUST also warn the user before loading a different configuration if the current canvas has unsaved changes.

#### Scenario: User starts a new orchestration with unsaved changes
- **WHEN** the user is modifying an orchestration and has added step nodes or configured edges
- **AND** the user clicks "New Orchestration"
- **THEN** the system shows a confirmation dialog
- **AND** upon confirmation, the canvas is reset to a single Start Node with no edges.

#### Scenario: User starts a new orchestration on a blank canvas
- **WHEN** the canvas only contains the Start Node
- **AND** the user clicks "New Orchestration"
- **THEN** the canvas is reset immediately without a confirmation dialog.

#### Scenario: User loads a config from library with unsaved work
- **WHEN** the user has added or modified stages or edges on the canvas
- **AND** the user clicks to load a different configuration from the Library or Recent Configs
- **THEN** the system shows a confirmation dialog warning about unsaved changes
- **AND** upon confirmation, the selected configuration is loaded.

