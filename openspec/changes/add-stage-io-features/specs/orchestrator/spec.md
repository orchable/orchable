## MODIFIED Requirements
### Requirement: Stage Configuration Definition
The system SHALL allow users to define a pipeline step (`StepConfig`) via the StageConfigPanel, storing the configuration globally within the Orchestrator schema.
**MODIFIED**: Added `export_config` definition.

#### Scenario: User saves a Stage Configuration with an Export Setting
- **WHEN** the user navigates to the 'IO' tab in the Stage Configuration Panel and defines an Export Destination (e.g., Google Sheet `sheet_id`).
- **THEN** the system saves the `export_config` parameters inside the Stage Configuration JSON in the `prompt_templates.stage_config` column.
- **AND** the Orchestrator Execution engine queues the export hook to trigger once the stage dynamically completes via wildcard iteration ("Last Sibling Standing" logic).

## MODIFIED Requirements
### Requirement: Orchestrator Launcher Metric Calculation
The system SHALL calculate the token usage cost for execution projection in `Calculator.tsx`.
**MODIFIED**: Accounting for Auxiliary document footprint.

#### Scenario: Cost Warning for Free Users Attempting Massive RAG Injections
- **WHEN** a Free Tier user selects an Orchestrator Config containing an attached Auxiliary Document exceeding 10,000 input tokens.
- **THEN** the Launcher Calculator intercepts the calculation projection and displays an alert indicating Token Quota Limit Exceeded.
- **AND** disables the Run Execution button.

#### Scenario: Caching Price Estimation for Premium Users
- **WHEN** a Premium Tier user launches a configuration with large Auxiliary Documents.
- **THEN** the Calculation view displays a breakdown of `Cache Storage Cost (Time)` vs `Cached Inference Cost (Token)` vs `Standard Inference Cost`.
- **AND** executes the Cache creation middleware sequentially.
