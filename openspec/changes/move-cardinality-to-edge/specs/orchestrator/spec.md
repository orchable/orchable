## MODIFIED Requirements

### Requirement: Custom Input Mapping Routing
The Execution Worker (`taskExecutor.worker.ts`) SHALL honor the Post-Process Hook's `input_source` and `custom_input_mapping` parameters when transmitting the results of an executed AI task to the configured Webhook. The worker SHALL read routing parameters (cardinality, split/merge configuration) from per-edge config within `next_stage_configs[]` rather than from `currentStageConfig`.

#### Scenario: User routes only AI output to Webhook
- **WHEN** a Post-Process Webhook is configured with `input_source: "output_only"`
- **THEN** the executor payload exactly matches the `result` of the generative AI task.
- **AND** the `currentInputData` (Context) is omitted from the payload to conserve bandwidth.

#### Scenario: User routes custom JSONPath mapping
- **WHEN** a Post-Process Webhook is configured with `input_source: "custom"` and `custom_input_mapping`
- **THEN** the executor evaluates the JSONPath expression against the merged `{ input, output }` object
- **AND** transmits only the resolved segment or structure to the remote URL.

#### Scenario: Worker processes per-edge routing
- **WHEN** the worker completes a task and invokes `handleNextStages`
- **THEN** the worker iterates over each entry in `next_stage_configs[]`
- **AND** for each entry, reads the edge-level `cardinality`, `split_path`, `split_mode`, `merge_path` from that config entry
- **AND** creates downstream tasks according to the edge's specific routing.
