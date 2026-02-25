# IOSTEM Workflow Issues & Fixes

> **Date:** 2025-12-13  
> **Purpose:** Document issues detected within n8n workflows and their corresponding fixes.

---

## Workflow 1: [IOSTEM] Load Batch - Supabase to n8n

**File:** `docs/iostem-gen/n8n-workflow/[IOSTEM] Load Batch - Supabase to n8n.json`

### ✅ Structure (OK)

```
[Schedule Trigger: Every 1 min]
       │
       ▼
[Supabase: Get Pending Tasks WHERE status='pending']
       │
       ▼
[IF: Has Pending Tasks?]
       │
   ┌───┴───┐
  Yes     No
   │       │
   ▼       ▼
[Code: Transform for n8n Table]  [No-Op]
   │
   ▼
[Data Table: Insert into n8n-task-queue]
   │
   ▼
[Supabase: Update status='processing', started_at=NOW()]
```

### ✅ No critical issues identified

- Utilizes Supabase credentials (<SUPABASE_DB_PASSWORD>).
- Complete transformation logic.
- Correct status updates to 'processing'.

---

## Workflow 2: [IOSTEM] Sync Back to Supabase

**File:** `docs/iostem-gen/n8n-workflow/[IOSTEM] Sync Back to Supabase.json`

### 🔴 Issue 1: Using Anon Key instead of Service Role Key

**Location:** "ENV" Node (line 124)

**Current:**
```json
"SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1naWN3a2Z0YmlxZHl5Zm1kaWN1Iiwicm9sZSI6ImFub24iLC..."
```

**Problem:** This is an **anon key** (role: "anon"), not a service_role key. The anon key is restricted by RLS and cannot update `ai_tasks`.

**Solution:** Replace with a genuine service_role key from the Supabase Dashboard.

### 🟡 Issue 2: Lack of Error Case Handling

**Current:** Only synchronizes tasks with `status='generated'`. No logic exists for failed tasks.

**Solution:** Add a branch to process failed tasks.

---

## Workflow 3: [IOSTEM] Agent 1 - Task Processor

**File:** `docs/iostem-gen/n8n-workflow/[IOSTEM] Agent 1 - Task Processor.json`

### Further review required

This file is large (367KB) and requires verification of:
- [ ] Task processing logic
- [ ] API key rotation
- [ ] Error handling
- [ ] Output format

---

## NEW WORKFLOWS CREATED (2025-12-13)

### Workflow 4: [IOSTEM] Create Stage 2 Tasks

**File:** `[IOSTEM] Create Stage 2 Tasks.json`

**Purpose:** Automatically creates Stage 2 tasks upon completion of Stage 1.

**Flow:**
```
[Schedule: Every 3 min]
       │
       ▼
[GET ai_tasks WHERE status='completed' AND phase_code='stage_1']
       │
       ▼
[Transform to Stage 2 task format]
       │
       ▼
[INSERT new ai_tasks with phase_code='stage_2']
       │
       ▼
[UPDATE Stage 1 task: phase_code='stage_1_processed']
```

**Note:** The ENV node must be updated with a real service_role key.

---

### Workflow 5: [IOSTEM] Retry Failed Tasks

**File:** `[IOSTEM] Retry Failed Tasks.json`

**Purpose:** Automatically retries failed tasks with a `retry_count < 3`.

**Flow:**
```
[Schedule: Every 15 min]
       │
       ▼
[GET ai_tasks WHERE status='failed' AND retry_count < 3]
       │
       ▼
[UPDATE: status='pending', retry_count++, clear error]
```

**Note:** The ENV node must be updated with a real service_role key.

---

## Action Items

### Immediate

1. **[FIX]** Update the ENV node in the Sync Back workflow with a real service_role key.
2. **[FIX]** Add a branch to handle failed tasks in the Sync Back workflow.

### Post-fix Testing

```bash
# 1. Upload test tasks
cd docs/iostem-gen
python upload_tasks_to_supabase.py --dry-run

# 2. Verify in Supabase Dashboard
# - Are there pending records in ai_tasks?
# - Are the task_batches counters correct?

# 3. Manually run n8n workflows
# - Load Batch: Verify tasks sync to the n8n Data Table
# - Agent Processor: Verify task processing
# - Sync Back: Verify results callback to Supabase
```

---

## Required Environment Variables

| Variable | Description | Source |
|----------|-------|----------|
| `SUPABASE_URL` | `https://mgicwkftbiqdyyfmdicu.supabase.co` | Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (role: "service_role") | Dashboard > Settings > API |
| `SUPABASE_ANON_KEY` | Anon key (for frontend) | Dashboard > Settings > API |

### Key Differentiation

Decode JWT at https://jwt.io:

- **Anon key:** `"role": "anon"`
- **Service role key:** `"role": "service_role"`
