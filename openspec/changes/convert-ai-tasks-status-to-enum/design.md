## Goals
- Enforce strict values for `ai_tasks.status` at the database level.
- Maintain compatibility with existing code and views.

## Decisions
### Enum Type Name
The type will be named `ai_task_status`.

### Included Values (Unified Lifecycle)
- `plan`: Task created (by AI or Launcher) and written to Supabase.
- `pending`: Task pulled from Supabase into n8n data table (intermediate n8n state).
- `running`: Task currently being executed by an agent.
- `processing`: Concurrent state with running (supported for legacy/worker parity).
- `awaiting_approval`: Task execution finished, pending manual review.
- `approved`: Task approved by human (triggers next stages).
- `completed`: Task successfully finished.
- `generated`: AI content successfully parsed (often maps to completed).
- `failed`: Finished with error.
- `cancelled`: Stopped by user.
- `skipped`: Bypassed by logic.

### User Action Required: n8n Workflow Updates
The following updates must be performed manually in n8n to align with the new lifecycle:

#### 1. `[Base] Base Agent with Key.json`
- **Node: `Determine Next Stage` (Phase 5)**
    - Update the `buildTaskMetadata` function: Change `status: 'pending'` to `status: 'plan'`.
- **Node: `Aggregate & Prepare Merge Task`**
    - Update `completedTasks` filter: `const completedTasks = siblingTasks.filter(t => ['completed', 'generated', 'approved'].includes(t.status));`
    - Update child task creation in the loop: Change `status: 'pending'` to `status: 'plan'`.

#### 2. `[Base] Load Batch - Supabase to n8n.json`
- **Node: `6. FINAL OUTPUT` (or similar transformation node)**
    - Inside the `json` return object: Change `status: 'plan'` to `status: 'pending'`.
    - This ensures that tasks loaded into the n8n Data Table are marked as `pending` while they wait for the agent to start them.

### Supabase Implementation Details
- **Type**: `ai_task_status` (Enum)
- **Default**: `'plan'`
- **Migration**: Convert existing `character varying` to the new type using casting.
- **View**: `v_runnable_tasks` must be updated to filter for `status::text = 'plan'` for initial pickup.

## Risks / Trade-offs
- **Downtime**: `ALTER TABLE ... TYPE ...` can take an ACCESS EXCLUSIVE lock. With a large table, this might cause a brief pause. Given the size and use case, this is acceptable.
- **Rollback**: To rollback, we'd need to convert back to `text`.
