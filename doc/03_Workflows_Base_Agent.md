# 🤖 Workflow: Base Agent (Details)

The **Base Agent** is the most critical workflow, responsible for executing AI tasks. The current version (`_Script.json`) utilizes a "Code-First" design with logic separated into script files.

## Processing Logic (The 6 Phases)

The workflow processes tasks through 6 sequential stages:

### Phase 1: Parse Task (`phase1_parse_task.js`)
- **Duty**: Receives raw tasks from the n8n node (Supabase), cleaning and normalizing the data.
- **Core Logic**:
    - Parses JSON string fields (`data`, `extra`, `ai_settings`, `hierarchy_path`) into objects.
    - Maps full metadata: `launch_id`, `user_id`, `batch_id`.
    - Ensures valid input `status`.
    - Sorts priority (Test mode > Batch Priority > Sequence).

### Phase 2: Pre-Process (`phase2_pre_process.js`)
- **Duty**: Prepares additional data before calling the AI.
- **Core Logic**:
    - Checks `extra.pre_process.enabled`.
    - If enabled, calls a webhook (`webhook_url`) to fetch external data (e.g., retrieving lesson content from a CMS).
    - Merges returned results into the task's `data`.
    - On failure: Can either `abort` the task or `continue` depending on the `on_failure` configuration.

### Phase 3: AI Execution & Parsing (`phase3_parse_report.js`)
- **Duty**: Invokes the Gemini API, receives results, and reports Key health.
- **Core Logic**:
    - **API Call**: Uses a key from the Key Rotator. Prioritizes `ai_settings` from Phase 2 (if overrides exist) > Phase 1.
    - **Parsing**: Filters JSON content from AI Markdown responses (handling ` ```json ` blocks).
    - **Validation**: Verifies if the JSON is valid.
    - **Reporting**: Calls the `set-key-state` webhook to report `success` or `fail` to the Key Rotator.
    - **Status Update**: Sets `status: 'generated'`.
    - **Data Preservation**: Preserves input metadata fields in the output.

### Phase 4: Post-Process (`phase4_post_process.js`)
- **Duty**: Handles post-processing after obtaining AI results.
- **Core Logic**:
    - Checks `extra.post_process.enabled`.
    - Sends results (`result`) to a destination webhook (e.g., saving to a vector DB, sending notifications).
    - Does not modify the primary `result` of the task; performs side-effects only.

### Phase 5: Prepare Next Tasks (`phase5_prepare_next_tasks.js`)
- **Duty**: Determines what needs to be done next (Next Stage).
- **Core Logic**:
    - Reads `next_stage_configs` from `extra`.
    - Reads the `grt` (Global Routing Table) for mapping.
    - **Cardinality Handling**:
        - `one_to_one`: 1 parent task produces 1 child task.
        - `one_to_many`: 1 parent task produces N child tasks (based on an array within the `result`).
    - **Hydration**: Generates metadata for child tasks (calculating `sequence`, `step_number`, `hierarchy_path`).

### Phase 6: Format Tasks (`phase6_format_tasks.js`)
- **Duty**: Normalizes the final format for insertion into the database.
- **Core Logic**:
    - Converts the array of objects from Phase 5 into the standard Supabase format.
    - Filters out redundant or erroneous fields.

## Error Handling
- **Retry Logic**: The workflow includes an internal retry mechanism (3 times) for API errors (Network, 5xx).
- **Key Rotation**: If a Key fails (403, 429), it automatically reports the failure and requests a new key during the subsequent retry.
- **Catch All**: For logic errors (e.g., JSON Parse fail), the task is marked as `failed`, and an `error_message` is logged to the DB for Manual Review.
