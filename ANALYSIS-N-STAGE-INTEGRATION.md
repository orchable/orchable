# Analysis: Integrating N-Stage Orchestrator into lovable-app-insights

> **Date:** 2026-01-31  
> **Reference:** [enhance-n-stage-orchestrator](file:///Users/tonypham/MEGA/WebApp/pbl-asset-tools/openspec/changes/enhance-n-stage-orchestrator)

## 1. Current App Architecture

### Pages

| Page | Component | Purpose |
|------|-----------|---------|
| `/designer` | `OrchestratorDesigner` | Visual workflow designer (ReactFlow) |
| `/launcher` | `LauncherPage` | Config selection + TSV upload + execution trigger |
| `/monitor` | `MonitorPage` | Execution list + step timeline |

### Data Model (Supabase Tables)

```
lab_orchestrator_configs (workflows)
├── id, name, description
├── steps: StepConfig[] (JSON)
└── n8n_workflow_id

lab_executions (workflow runs)
├── id, config_id
├── syllabus_row (input data)
├── status, total_steps, completed_steps
└── started_at, completed_at

lab_step_executions (individual steps)
├── id, execution_id, step_id, step_name
├── status, result, error_message
└── n8n_execution_id, duration_ms
```

### Services

| Service | Purpose |
|---------|---------|
| `executionService.ts` | CRUD for executions + step_executions |
| `n8nService.ts` | Trigger n8n workflows, compile configs |
| `configService.ts` | CRUD for orchestrator configs |

---

## 2. Gap Analysis vs N-Stage Orchestrator

### Features IN enhance-n-stage-orchestrator

| Feature | Status in lovable-app-insights |
|---------|-------------------------------|
| `root_task_id` (hierarchy root) | ❌ Missing |
| `hierarchy_path` (ancestor chain) | ❌ Missing |
| `stage_key` (human-readable stage) | ⚠️ Has `step_name` but not `stage_key` |
| Pipeline progress visualization | ❌ Missing (has timeline but not pipeline view) |
| Per-stage progress breakdown | ❌ Missing |
| `get_hierarchy_progress()` SQL function | ❌ Not used |

### Current App Strengths

| Feature | Available |
|---------|-----------|
| Visual workflow designer | ✅ ReactFlow-based |
| Execution launcher with config selection | ✅ |
| Real-time polling (3s interval) | ✅ |
| Step timeline with expand/collapse | ✅ |
| n8n integration (trigger workflows) | ✅ |
| Supabase data persistence | ✅ |

---

## 3. Integration Recommendations

### 3.1 Database Schema Updates

Add hierarchy fields to `lab_step_executions`:

```sql
ALTER TABLE lab_step_executions
ADD COLUMN root_execution_id UUID REFERENCES lab_executions(id),
ADD COLUMN hierarchy_path JSONB DEFAULT '[]',
ADD COLUMN stage_key VARCHAR(50);
```

### 3.2 Type Updates (`lib/types.ts`)

```typescript
// Add to StepExecution interface
export interface StepExecution {
  // ... existing fields
  root_execution_id?: string;    // NEW
  hierarchy_path?: string[];      // NEW
  stage_key?: string;             // NEW
}
```

### 3.3 New Component: PipelineProgress

Copy/adapt from `pbl_creator_ai`:
- `PipelineProgress.tsx` - Stage cards with arrows
- Integrate into `MonitorPage` above the timeline

### 3.4 Monitor Page Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Pipeline View** | Add `PipelineProgress` above step timeline |
| **Stage Filtering** | Filter steps by `stage_key` |
| **Hierarchy Progress** | Show `completed/total` per stage |

### 3.5 Launcher Page Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Set hierarchy fields** | When creating execution, set `root_execution_id` and `hierarchy_path` |
| **Stage preview** | Show stages from selected config |

---

## 4. Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| 🔴 High | Add `PipelineProgress` component | 30 min |
| 🔴 High | Update `StepExecution` type | 10 min |
| 🟡 Medium | Add hierarchy fields to DB | 20 min |
| 🟡 Medium | Update `executionService` to set hierarchy | 20 min |
| 🟢 Low | Add stage filtering to Monitor | 30 min |

---

## 5. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/common/PipelineProgress.tsx` | Pipeline visualization |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add hierarchy fields |
| `src/pages/Monitor.tsx` | Add PipelineProgress |
| `src/services/executionService.ts` | Set hierarchy on create |

---

## 6. Migration from pbl_creator_ai

Can directly reuse:
- `PipelineProgress.tsx` component (adapt imports)

Need adaptation:
- `api-batch-questions-status.ts` → use `executionService` instead

---

## Next Steps

1. Confirm approach với user
2. Create DB migration (if not already done in main DB)
3. Add `PipelineProgress` component
4. Integrate vào `MonitorPage`
5. Test with existing executions
