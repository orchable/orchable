## ADDED Requirements

### Requirement: Sub-Orchestration Stage Type
A Stage in an OrchestratorConfig SHALL support `task_type: "sub_orchestration"` with a `sub_orchestration_id` field referencing another `OrchestratorConfig`. When resolved, the system SHALL inline-merge (flatten) the sub-orchestration's stages into the parent orchestration's pipeline, replacing the sub-orchestration stage.

#### Scenario: Basic Inline Merge
- **WHEN** Orchestration A has Stage B with `sub_orchestration_id = orchB.id`
- **AND** Orchestration B has stages M (1:1) → N (1:N)
- **THEN** the resolved pipeline SHALL be: Stage A → Stage M → Stage N → Stage C
- **AND** Stage M SHALL inherit Stage B's incoming edges
- **AND** Stage N SHALL inherit Stage B's outgoing edges

#### Scenario: Multi-level Nesting
- **WHEN** Orchestration A has a sub-orchestration stage pointing to Orchestration B
- **AND** Orchestration B has a sub-orchestration stage pointing to Orchestration C
- **THEN** the resolved pipeline SHALL flatten all levels into a single pipeline
- **AND** the maximum nesting depth SHALL be configurable (default: 5)

### Requirement: Stage Key Collision Detection
The system SHALL detect stage key collisions when resolving inline merges. At design-time, a warning MUST be displayed if collision is detected. At runtime, the system SHALL auto-prefix colliding keys with `sub_{parentStageKey}__` as a safety net.

#### Scenario: Collision Warning at Design-time
- **WHEN** a user configures Stage B as sub-orchestration pointing to Orchestration B
- **AND** Orchestration B has a stage with the same `stage_key` as another stage in Orchestration A
- **THEN** the Designer SHALL display a warning indicating the collision

### Requirement: Circular Dependency Prevention
The system SHALL prevent circular dependencies in nested orchestrations. If Orchestration A references B, and B references A (directly or transitively), the system MUST block the save and display an error.

#### Scenario: Direct Circular Dependency
- **WHEN** a user tries to set a stage in Orchestration A to reference Orchestration A itself
- **THEN** the system SHALL block the save and display an error message

#### Scenario: Transitive Circular Dependency
- **WHEN** Orchestration A references Orchestration B
- **AND** the user tries to set a stage in Orchestration B to reference Orchestration A
- **THEN** the system SHALL block the save and display an error message

### Requirement: Sub-Orchestration Designer UI
The Designer SHALL provide UI controls for configuring and viewing sub-orchestration stages.

#### Scenario: Configure Sub-Orchestration
- **WHEN** a user selects `task_type: "Sub-Orchestration"` in the Stage Config Panel
- **THEN** the panel SHALL hide prompt template and AI settings sections
- **AND** display a dropdown to select an existing Orchestration as the sub-orchestration

#### Scenario: View Sub-Orchestration Detail
- **WHEN** a user clicks "View Detail" on a sub-orchestration node
- **THEN** the system SHALL navigate to the OrchestratorDesigner page for the sub-orchestration

#### Scenario: Expand All View
- **WHEN** a user clicks "Expand All" in the toolbar
- **THEN** the Designer SHALL display the fully resolved (flattened) pipeline on the canvas
- **AND** sub-orchestration stages SHALL be visually distinguished (e.g., grouped border or color)
