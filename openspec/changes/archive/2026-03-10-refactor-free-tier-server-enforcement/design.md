# Design: Free Tier Server-Side Enforcement

## Context
Current Free Tier uses client-side IndexedDB + Web Worker for everything, with a client-enforced usage limit that can be trivially bypassed. We need server-side enforcement for Free users who don't provide their own API key, while keeping local execution for BYOK users.

## Goals
- Enforce 30 completed tasks/month on the server for Free (no-key) users using a permanent counter
- Keep Web Worker execution for Free BYOK users (no limit, no server dependency)
- Auto-cleanup Free Tier completed task data from Supabase after 1 day (counter unaffected)
- Notify users via email and in-app about data expiration
- Support Premium BYOK with user's own key through n8n

## Non-Goals
- Changing Premium (no-key) flow (already works via Supabase + n8n)
- Building a full billing/subscription system
- Offline-first support for Free (no-key) users

## Architecture Decisions

### Decision 1: Separate Usage Counter from Task Data

> [!CAUTION]
> The usage counter and task data must have **independent lifecycles**. The CRON job deletes task data, but the counter must NEVER decrement.

**Usage counter**: Stored in `user_usage` table (already exists via `increment_user_usage` RPC). Incremented atomically when a task reaches `completed` status. Queried by `submit_free_tier_tasks` to check quota.

**Task data**: Stored in `ai_tasks`. Subject to 1-day TTL cleanup for Free (no-key) users. The deletion of task rows does NOT affect the usage counter.

```
                    ┌──────────────┐
Task completes ───► │ user_usage   │ ◄── Quota check reads from here
                    │ count: +1    │     (permanent, never decrements)
                    └──────────────┘

                    ┌──────────────┐
After 1 day ──────► │ ai_tasks     │ ◄── Client syncs from here
                    │ DELETE rows  │     (ephemeral for free_pool)
                    └──────────────┘
```

### Decision 2: Execution Path Router
The system needs a single decision point to determine the execution path.

**Location**: `executionRouter.ts` (new file)

**Logic**:
```
if (tier === 'free' && hasPersonalKeys) → Web Worker (local, IndexedDB)
if (tier === 'free' && !hasPersonalKeys) → Supabase + n8n (server, quota-checked)
if (tier === 'premium') → Supabase + n8n (server, user's key if BYOK)
```

### Decision 3: Server-Side Quota Check
Use a Supabase RPC function that checks the **permanent usage counter** then inserts tasks.

```sql
CREATE OR REPLACE FUNCTION submit_free_tier_tasks(
    p_user_id UUID,
    p_tasks JSONB
) RETURNS JSONB AS $$
DECLARE
    v_used INT;
    v_new_count INT;
    v_limit INT := 30;
BEGIN
    -- Read from PERMANENT usage counter (not task rows!)
    SELECT COALESCE(task_count, 0) INTO v_used
    FROM user_usage
    WHERE user_id = p_user_id
      AND month = to_char(now(), 'YYYY-MM');

    v_new_count := jsonb_array_length(p_tasks);

    IF v_used + v_new_count > v_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'QUOTA_EXCEEDED',
            'used', v_used,
            'limit', v_limit,
            'remaining', GREATEST(0, v_limit - v_used)
        );
    END IF;

    -- Insert tasks with tier_source marker
    -- (usage counter is incremented LATER when tasks complete, not here)
    INSERT INTO ai_tasks (...)
    SELECT ... FROM jsonb_array_elements(p_tasks);

    RETURN jsonb_build_object(
        'success', true,
        'used', v_used,
        'remaining', v_limit - v_used - v_new_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> [!NOTE]
> The quota check counts `v_used` from `user_usage` (permanent counter), NOT from `ai_tasks` rows. This ensures deleted tasks still count toward the limit.

### Decision 4: Usage Counter Increment
When n8n marks a task as `completed`, increment the permanent counter:

```sql
-- Called by n8n or a trigger on ai_tasks status change
CREATE OR REPLACE FUNCTION on_task_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed'
       AND NEW.tier_source = 'free_pool' THEN
        -- Increment permanent counter
        INSERT INTO user_usage (user_id, month, task_count)
        VALUES (NEW.user_id, to_char(now(), 'YYYY-MM'), 1)
        ON CONFLICT (user_id, month)
        DO UPDATE SET task_count = user_usage.task_count + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_completed
    AFTER UPDATE ON ai_tasks
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION on_task_completed();
```

### Decision 5: New Columns on `ai_tasks`

```sql
-- Distinguish task origin for cleanup and key resolution
ALTER TABLE ai_tasks ADD COLUMN tier_source VARCHAR(20) DEFAULT NULL;
-- Values: 'free_pool', 'free_byok', 'premium_pool', 'premium_byok', NULL (legacy)

-- Track whether client has downloaded results
ALTER TABLE ai_tasks ADD COLUMN synced_to_client BOOLEAN DEFAULT FALSE;
```

### Decision 6: Auto-Cleanup CRON
Use `pg_cron` to delete expired Free Tier task data:

```sql
SELECT cron.schedule(
    'cleanup-free-tier-tasks',
    '0 */6 * * *',  -- Every 6 hours
    $$
    DELETE FROM ai_tasks
    WHERE tier_source = 'free_pool'
      AND status = 'completed'
      AND completed_at < now() - interval '1 day'
    $$
);
```

> [!IMPORTANT]
> This deletes **task data only**. The `user_usage` counter is untouched. Even after deletion, the user's 30/month quota remains consumed.

### Decision 7: Sync-Back Flow
Client polls for completed tasks, downloads to IndexedDB, then marks as synced:

1. Client polls: `GET ai_tasks WHERE status='completed' AND synced_to_client=false AND tier_source='free_pool'`
2. Client saves `output_data` to local IndexedDB
3. Client confirms: `PATCH ai_tasks SET synced_to_client = true`
4. CRON later deletes the row (whether synced or not, after 1 day)

Auto-trigger on:
- App load (if Free user has pending results)
- Background polling every 30s while browser is open
- Push notification via Supabase Realtime (optional enhancement)

### Decision 8: n8n Key Resolution for BYOK
When n8n processes a task with `tier_source = 'premium_byok'`:
1. Look up `user_api_keys` for the task's `user_id`
2. Use user's key instead of platform pool
3. Rotate among user's keys

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Free user loses results if they don't sync in 1 day | Email warning + in-app toast at creation + auto-sync on app load |
| Sub-tasks inflate the 30/month count (e.g. 5-stage orchestration = 5 tasks) | Clear documentation; strong upgrade incentive |
| Permanent counter can't be "refunded" for failed tasks | By design: only `completed` tasks increment counter |
| n8n processing delay for Free users | Free pool has lower priority; queue-based FIFO |

## Migration Plan
1. Add `tier_source` and `synced_to_client` columns to `ai_tasks`
2. Ensure `user_usage` table has correct schema (user_id, month, task_count)
3. Create `submit_free_tier_tasks` RPC function
4. Create `on_task_completed` trigger for usage counter increment
5. Create cleanup CRON job
6. Update client execution router
7. Update UI with quota warnings and sync-back flow
8. Deploy and monitor
