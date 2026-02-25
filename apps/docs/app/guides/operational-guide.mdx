# ⚙️ Operational & Debugging Guide

## 1. Activating a New Batch
To run a new course material generation batch without using the UI:

1.  Prepare a configuration file (Preset) or use an existing one.
2.  Insert a record into the `task_batches` table:
```sql
INSERT INTO task_batches (name, preset_key, status, total_tasks, config)
VALUES ('Test Batch Manual', 'syllabus_gen_v1', 'pending', 1, '{"input_file": "..."}');
```
*Note*: The `[Base] Load Batch` workflow will automatically scan and process this record.

## 2. Checking Status
To view progress:
```sql
-- View batch overview
SELECT name, status, completed_tasks, failed_tasks FROM task_batches;

-- View failed tasks
SELECT id, error_message FROM ai_tasks WHERE status = 'failed';

-- View stuck tasks (processing for too long)
SELECT id, started_at FROM ai_tasks 
WHERE status = 'processing' 
AND started_at < NOW() - INTERVAL '30 minutes';
```

## 3. Troubleshooting

### Issue: Task stuck in `status: 'plan'` indefinitely
- **Cause**:
    - The `[Base] Base Agent` n8n workflow is inactive.
    - No API Keys are available (quota exceeded, all keys blocked).
- **Resolution**:
    - Verify in the n8n UI that the workflow is Active.
    - Check the `api_key_health` table.

### Issue: Task `failed` with a JSON Parse error
- **Cause**: AI returned malformed Markdown or non-standard JSON formatting.
- **Resolution**:
    - Review the `error_message` in the `ai_tasks` table.
    - Adjust the Prompt Template to instruct the AI more clearly for standard JSON.
    - Reset the status to `plan` to retry:
    ```sql
    UPDATE ai_tasks SET status = 'plan', retry_count = 0 WHERE id = '<task_id>';
    ```

### Issue: Child tasks not created (Data loss)
- **Cause**: Error in Phase 5 (Prepare Next Tasks), typically due to incorrect `next_stage_config` or missing `grt`.
- **Resolution**: Examine the `extra` field of the parent task for valid `grt` entries.

## 4. Periodic Maintenance
- **Purge Old Logs**: The `api_key_usage_log` table can grow rapidly. Periodically clean up logs older than 30 days.
- **Database Vacuum**: Run `VACUUM ANALYZE` on large tables like `ai_tasks`.
