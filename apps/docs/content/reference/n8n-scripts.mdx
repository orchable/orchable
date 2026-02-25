---
sidebar_position: 1
title: n8n Scripts
---

# 📜 Scripts Reference (`src/n8n/scripts`)

This directory contains the JavaScript source code that executes the logic for the nodes in the n8n workflows.

## Conventions
- **File Name**: `phase{N}_{action}.js`
- **Platform**: Node.js (n8n Sandbox).

## Script Details

### `phase1_parse_task.js`
- **Duty**: Receives raw tasks from the Supabase node, cleaning and normalizing the data.
- **Functionality**:
    - Sorts tasks by `test_mode` > `batch_priority`.
    - Safely performs `JSON.parse` on stringified fields.
    - Assigns default metadata values.

### `phase2_pre_process.js`
- **Duty**: prepares additional data before calling the AI.
- **Functionality**:
    - Invokes an External Webhook if enabled.
    - Handles pre-processing errors.

### `phase3_parse_report.js`
- **Duty**: Invokes the Gemini API and parses the response.
- **Functionality**:
    - Reports Key health (Success/Fail) back to the Rotator.
    - Parses Markdown JSON blocks from AI responses.

### `phase4_post_process.js`
- **Duty**: Handles side-effects after obtaining results.
- **Functionality**:
    - Dispatches results to external destinations.

### `phase5_prepare_next_tasks.js`
- **Duty**: The most complex logic. Handles GRT, Cardinality, and Splitting.
- **Functionality**: Decides whether to terminate the chain or create child tasks for next stages.

### `phase6_format_tasks.js`
- **Duty**: Normalizes data for database insertion.
- **Functionality**: Maps field names to align with the Database Schema.

### `api_key_universal_logic.js`
- **Location**: Used in the **API Key Rotation Manager** workflow.
- **Functionality**: Logic for selecting the best key from the pool (cooldown, usage, priority).

*Last Updated: 2026-02-24*
