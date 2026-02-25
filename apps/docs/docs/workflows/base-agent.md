---
sidebar_position: 1
title: Base Agent
---

# 🤖 Workflow: Base Agent

The **Base Agent** is the most critical workflow, responsible for executing AI tasks. The current version utilizes a "Code-First" design with logic separated into script files.

## Processing Logic (The 6 Phases)

The workflow processes tasks through 6 sequential stages:

### Phase 1: Parse Task (`phase1_parse_task.js`)
- **Duty**: Receives raw tasks from the n8n node (Supabase), cleaning and normalizing the data.
- **Core Logic**:
    - Parses JSON string fields (`input_data`, `extra`, `ai_settings`, `hierarchy_path`) into objects.
    - Maps full metadata: `launch_id`, `user_id`, `batch_id`.
    - Sorts priority (Test mode > Batch Priority > Sequence).

### Phase 2: Pre-Process (`phase2_pre_process.js`)
- **Duty**: Prepares additional data before calling the AI.
- **Core Logic**:
    - Checks `extra.pre_process.enabled`.
    - If enabled, calls a webhook to fetch external data (e.g., retrieving context from a CMS).
    - Merges returned results into the task's `data`.

### Phase 3: AI Execution & Parsing (`phase3_parse_report.js`)
- **Duty**: Invokes the Gemini API, receives results, and reports Key health.
- **Core Logic**:
    - **API Call**: Uses a key from the Key Rotator.
    - **Parsing**: Filters JSON content from AI responses (handling markdown blocks).
    - **Reporting**: Calls the `set-key-state` webhook to report `success` or `fail` to the Key Rotator.
    - **Status Update**: Sets `status: 'generated'`.

### Phase 4: Post-Process (`phase4_post_process.js`)
- **Duty**: Handles post-processing after obtaining AI results.
- **Core Logic**:
    - Checks `extra.post_process.enabled`.
    - Sends results to a destination webhook.
    - Performs side-effects only (does not modify primary data).

### Phase 5: Prepare Next Tasks (`phase5_prepare_next_tasks.js`)
- **Duty**: Determines what needs to be done next (Next Stage).
- **Core Logic**:
    - Reads `next_stage_configs` and the **GRT** (Global Routing Table).
    - Handles **Cardinality** (1:1, 1:N).
    - Generates metadata for child tasks.

### Phase 6: Format Tasks (`phase6_format_tasks.js`)
- **Duty**: Normalizes the final format for insertion into the database.
- **Core Logic**:
    - Converts the array of objects into standard Supabase format.

## Error Handling
- **Retry Logic**: Internal retry mechanism (3 times) for network errors.
- **Key Rotation**: Automatically requests a new key if current one fails (403, 429).
- **Manual Review**: Logic errors mark tasks as `failed` for human intervention.

*Last Updated: 2026-02-24*
