---
sidebar_position: 3
title: Operational Guide
---

# ⚙️ Operational & Debugging Guide

## 1. Activating a New Batch
To run a new batch without using the UI:

1.  Insert a record into the `task_batches` table:
```sql
INSERT INTO task_batches (name, preset_key, status, total_tasks, config)
VALUES ('Test Batch Manual', 'syllabus_gen_v1', 'pending', 1, '{"input_file": "..."}');
```

## 2. Checking Status
To view progress via SQL:
```sql
-- View batch overview
SELECT name, status, completed_tasks, failed_tasks FROM task_batches;

-- View failed tasks
SELECT id, error_message FROM ai_tasks WHERE status = 'failed';

-- View stuck tasks
SELECT id, started_at FROM ai_tasks 
WHERE status = 'processing' 
AND started_at < NOW() - INTERVAL '30 minutes';
```

## 3. Troubleshooting

### Issue: Task stuck in `status: 'plan'` indefinitely
- **Cause**:
    - The `[Base] Base Agent` n8n workflow is inactive.
    - No API Keys are available.
- **Resolution**:
    - Verify n8n workflow activity.
    - Check the `api_key_health` table.

### Issue: Task `failed` with a JSON Parse error
- **Cause**: AI returned malformed Markdown/JSON.
- **Resolution**:
    - Review `error_message`.
    - Adjust Prompt Template instructions.
    - Reset to retry:
    ```sql
    UPDATE ai_tasks SET status = 'plan', retry_count = 0 WHERE id = '<task_id>';
    ```

### Issue: Child tasks not created
- **Cause**: Error in Phase 5 logic or missing `grt`.
- **Resolution**: Examine the `extra` field of the parent task for valid routing entries.

*Last Updated: 2026-02-24*
