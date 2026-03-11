## ADDED Requirements

### Requirement: Custom Input Mapping Routing
The Execution Worker (`taskExecutor.worker.ts`) SHALL honor the Post-Process Hook's `input_source` and `custom_input_mapping` parameters when transmitting the results of an executed AI task to the configured Webhook.

#### Scenario: User routes only AI output to Webhook
- **WHEN** a Post-Process Webhook is configured with `input_source: "output_only"`
- **THEN** the executor payload exactly matches the `result` of the generative AI task.
- **AND** the `currentInputData` (Context) is omitted from the payload to conserve bandwidth.

#### Scenario: User routes custom JSONPath mapping
- **WHEN** a Post-Process Webhook is configured with `input_source: "custom"` and `custom_input_mapping`
- **THEN** the executor evaluates the JSONPath expression against the merged `{ input, output }` object
- **AND** transmits only the resolved segment or structure to the remote URL.
