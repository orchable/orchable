# N8N Workflow Updates for N-Stage + HITL

> **Updated:** 2025-12-13  
> **Status:** Manual implementation required

---

## 1. Load Batch Workflow

### Current
```
Get Pending Tasks from Supabase
├── tableId: ai_tasks
├── filters: status = 'pending'
```

### Required Changes

**Option A: Use View (Recommended)**
```
Get Runnable Tasks from Supabase (Postgres node)
├── Query: SELECT * FROM v_runnable_tasks LIMIT 20
```

**Option B: Update Filter**
```
Get Pending Tasks from Supabase
├── tableId: ai_tasks
├── filters: 
│   ├── status = 'pending'
│   └── (use RPC to check parent status)
```

### Also Add Fields to Transform:
```javascript
// In "Transform for n8n Table" node
return {
  json: {
    // ... existing fields ...
    requires_approval: task.requires_approval || false,
    next_task_config: JSON.stringify(task.next_task_config || null),
  }
};
```

---

## 2. Sync Back to Supabase Workflow

### Required Changes

**After AI completes, check HITL:**
```javascript
// New node: "Determine Final Status"
const task = $input.item.json;
const aiResult = $('Gemini API Call').item.json;

let finalStatus = 'completed';
if (task.requires_approval) {
  finalStatus = 'awaiting_approval';
}

return { 
  ...task,
  output_data: aiResult.data,
  final_status: finalStatus
};
```

**Update Supabase with correct status:**
```
Update Status in Supabase
├── status: {{ $json.final_status }}
├── output_data: {{ $json.output_data }}
├── completed_at: {{ new Date().toISOString() }}
```

---

## 3. Create Next Task (Auto-chain)

**New node after sync (for non-HITL tasks):**
```javascript
// Node: "Create Next Task if Non-HITL"
if ($json.final_status === 'completed' && $json.next_task_config) {
  // Call Supabase RPC
  await $http.request({
    method: 'POST',
    url: `${ENV.SUPABASE_URL}/rest/v1/rpc/create_next_task_in_chain`,
    headers: {
      'apikey': ENV.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: { p_parent_task_id: $json.supabase_task_id }
  });
}
```

---

## SQL View Alternative

If n8n Supabase node doesn't support views, use Postgres node:

```sql
SELECT t.*, 
       tb.name as batch_name,
       tb.grade_code
FROM v_runnable_tasks t
LEFT JOIN task_batches tb ON t.batch_id = tb.id
LIMIT 20;
```

---

## Implementation Steps

1. [x] Open n8n UI
2. [x] Edit **[IOSTEM] Load Batch** workflow:
   - Replace Supabase node with Postgres node ✅
   - Query `v_runnable_tasks` instead of `ai_tasks` ✅
   - Add `requires_approval` and `next_task_config` to Transform ✅
3. [x] Edit **[IOSTEM] Sync Back to Supabase** workflow:
   - Replace HTTP Request with Postgres node ✅
   - Add "Determine Final Status" code node ✅
   - Use `awaiting_approval` when `requires_approval=true` ✅
4. [x] Add "Create Next Task" node for auto-chaining ✅
5. [ ] Test with a task that has `requires_approval=true`

---

## Updated Workflow JSONs

The following workflows have been updated and should be imported into n8n:

- **Load Batch**: Uses Postgres node with `v_runnable_tasks` view
- **Sync Back**: Uses Postgres node, determines HITL status, calls `create_next_task_in_chain()`

