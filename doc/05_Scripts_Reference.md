# 📜 Scripts Reference (`src/n8n/scripts`)

This directory contains the JavaScript source code that executes the logic for the nodes in the n8n workflows.

## Conventions
- **File Name**: `phase{N}_{action}.js`
- **Platform**: Node.js (n8n Sandbox). Avoid using `require` for external libraries unless they are natively supported by n8n.

## Script Details

### `phase1_parse_task.js`
- **Input**: JSON array from the Supabase node.
- **Output**: Single JSON Object (the highest priority task).
- **Functionality**:
    - Sorts tasks by `test_mode` > `batch_priority`.
    - Safely performs `JSON.parse` on stringified fields.
    - Assigns default metadata values (e.g., `retry_count = 0`).

### `phase2_pre_process.js`
- **Input**: Task Object from Phase 1.
- **Output**: Task Object + data merged from the webhook.
- **Functionality**:
    - Invokes an External Webhook.
    - Handles pre-processing errors (Ignore or Abort).

### `phase3_parse_report.js`
- **Input**: `input.all()` from 3 sources:
    1. `2. Pre-Process` (Source of Truth).
    2. `Get Key` (Key information used).
    3. `Gemini API Call` (Raw result).
- **Output**: Task Object updated with `result` and `status='generated'`.
- **Functionality**:
    - Reports Key health (Success/Fail) back to the Rotator.
    - Parses Markdown JSON blocks.

### `phase4_post_process.js`
- **Input**: Task Object from Phase 3.
- **Output**: Task Object (including post-process logs).
- **Functionality**:
    - Dispatches results.
    - Does not modify primary data.

### `phase5_prepare_next_tasks.js`
- **Input**: Task Object from Phase 4 (with updated status).
- **Output**:
    - `action`: Instruction string (`terminate` or `create_tasks_for_branches`).
    - `tasks`: Array of child task metadata objects.
- **Functionality**: The most complex logic. Handles GRT, Cardinality, and Splitting.

### `phase6_format_tasks.js`
- **Input**: Output from Phase 5.
- **Output**: Array of rows ready for insertion into the `ai_tasks` table.
- **Functionality**: Cleans data and maps field names to align with the Database Schema.

### `api_key_universal_logic.js`
- **Location**: Used in the **API Key Rotation Manager** workflow.
- **Functionality**: Logic for selecting the best key from the pool (checking cooldown, usage count, and priority).

### `api_key_health_check.js`
- **Location**: Used in the **API Key Rotation Manager** workflow.
- **Functionality**: Verifies if a key has expired or been blocked by the provider (via a test call).
