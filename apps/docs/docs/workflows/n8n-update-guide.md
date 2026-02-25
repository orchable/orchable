---
sidebar_position: 3
title: n8n Update Guide
---

# 📝 n8n Workflow Update Guide

This guide details the manual updates required to align n8n workflows with the N-Stage + HITL (Human-in-the-Loop) architecture.

---

## 1. Load Batch Workflow

### Pattern: Use Postgres View
Instead of querying the `ai_tasks` table directly, use the `v_runnable_tasks` view to ensure dependency logic is respected.

```sql
SELECT t.*, 
       tb.name as batch_name,
       tb.grade_code
FROM v_runnable_tasks t
LEFT JOIN task_batches tb ON t.batch_id = tb.id
LIMIT 20;
```

### Required Fields
Ensure the transformation node includes these metadata fields:
- `requires_approval`: Boolean for HITL.
- `next_task_config`: JSON for auto-chaining child tasks.

---

## 2. Sync Back to Supabase

### Determine Final Status
After AI processing, check if the task requires manual approval before proceeding.

```javascript
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

---

## 3. Create Next Task (Auto-chaining)

For non-HITL tasks, trigger the next step in the chain immediately via Supabase RPC.

```javascript
if ($json.final_status === 'completed' && $json.next_task_config) {
  await $http.request({
    method: 'POST',
    url: `${ENV.SUPABASE_URL}/rest/v1/rpc/create_next_task_in_chain`,
    body: { p_parent_task_id: $json.supabase_task_id }
  });
}
```

---

## 🛠️ Implementation Checklist
1. [ ] Update **Load Batch** to use `v_runnable_tasks`.
2. [ ] Update **Sync Back** to handle `awaiting_approval`.
3. [ ] Add auto-chaining node for continuous pipelines.
4. [ ] Test with a task where `requires_approval=true`.

*Last Updated: 2026-02-25*
