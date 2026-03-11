## ADDED Requirements

### Requirement: Orchestration Config Structural Validation
The system SHALL validate orchestration configurations against a canonical JSON Schema before they are persisted to the database or published to the Hub. The validation MUST check:
- All steps have required fields (`id`, `name`, `label`, `stage_key`, `task_type`, `cardinality`, `dependsOn`, `ai_settings`)
- The `dependsOn` graph forms a valid DAG (no cycles)
- All step IDs and stage keys are unique within the config
- Steps with `cardinality: "1:N"` have a non-empty `split_path`
- `ai_settings` includes a complete `generationConfig` with at least `temperature` and `maxOutputTokens`

#### Scenario: Valid orchestration config
- **WHEN** a developer runs the validation script on a well-formed orchestration JSON
- **THEN** the script reports PASS with zero errors and zero warnings

#### Scenario: Missing dependsOn on root step
- **WHEN** a step has no `dependsOn` field
- **THEN** the validation script reports a CRITICAL error: "step.{id}: missing required field 'dependsOn'"

#### Scenario: Cyclic dependency detected
- **WHEN** step_A depends on step_B and step_B depends on step_A
- **THEN** the validation script reports a CRITICAL error: "Cycle detected: step_A → step_B → step_A"

#### Scenario: SQL generation blocked on errors
- **WHEN** the validation script is run with `--sql` flag on a config with CRITICAL errors
- **THEN** the script prints all errors and exits with code 1 without generating SQL output

### Requirement: Defensive Config Loading
The Designer SHALL gracefully handle orchestration configs loaded from the database that have missing or malformed fields. Specifically, the `loadConfig()` function MUST treat missing `dependsOn` as an empty array rather than crashing.

#### Scenario: Load config with missing dependsOn
- **WHEN** the Designer loads a config from the database where a step has no `dependsOn` key
- **THEN** the step is rendered on the canvas with no incoming dependency edges (treated as a root node connected to Start)
- **AND** no JavaScript error is thrown
