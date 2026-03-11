# orchestrator Specification

## Purpose
TBD - created by archiving change upgrade-browser-key-rotation. Update Purpose after archive.
## Requirements
### Requirement: API Key State Tracking
The Execution Engine SHALL track the health, quota, and block status of each available Gemini API key within the browser execution context.

#### Scenario: Select Best API Key
- **WHEN** the Task Executor requests a key for the next API call
- **THEN** it SHALL prioritize keys based on 1) Health Status (healthy > degraded > disabled), 2) Remaining Token Quota (highest first), and 3) Least Recently Used time.

#### Scenario: Parse Rate Limit Headers
- **WHEN** the Gemini API returns a response
- **THEN** the Execution Engine SHALL parse the `X-RateLimit-Remaining-Requests` and `X-RateLimit-Remaining-Tokens` headers to update the internal state of the current API key.

### Requirement: API Error Classification and Blocking
The Execution Engine SHALL classify API errors to intelligently block or degrade keys to avoid sustained failures without exhausting healthy keys too quickly.

#### Scenario: 429 Rate Limit Error
- **WHEN** the Gemini API returns a 429 RESOURCE_EXHAUSTED error
- **THEN** the Key Manager SHALL block the key for a temporary duration (e.g. 15 minutes, or parsed from the `retry-after` header if present) and label it as `rate_limited`.

#### Scenario: 403 Permission Denied Error
- **WHEN** the Gemini API returns a 403 PERMISSION_DENIED error
- **THEN** the Key Manager SHALL block the key for an extended duration (e.g. 24 hours).

#### Scenario: 401 Unauthenticated Error
- **WHEN** the Gemini API returns a 401 UNAUTHENTICATED error
- **THEN** the Key Manager SHALL permanently mark the key as `disabled`.

#### Scenario: 500/503 Transient Server Errors
- **WHEN** the Gemini API returns 500 INTERNAL or 503 UNAVAILABLE errors
- **THEN** the Key Manager SHALL mark the key as `degraded` and increment a consecutive failure counter. If the counter exceeds a defined threshold (e.g. 3 fails), the key SHALL be temporarily blocked.

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

