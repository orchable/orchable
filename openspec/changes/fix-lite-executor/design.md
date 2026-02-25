# Design: fix-lite-executor

## Context

Orchable có 2 execution paths:
1. **Cloud** (Premium): Launcher → n8n webhook → 4 n8n workflows xử lý bằng server
2. **Lite** (Anonymous/Free): Launcher → Web Worker xử lý hoàn toàn bằng frontend + IndexedDB

Web Worker cần replicate logic của 4 n8n workflows:
- **Load Batch**: Load task từ queue, resolve template, substitute variables, build stage configs
- **Base Agent**: Call Gemini API, handle pre/post process, determine next stages, create child tasks
- **Load Prompt Template**: Sync templates (đã được handle bởi `stageService.ts`)
- **Sync Back**: Update task status (đã tự động khi dùng IndexedDB)

## Goals

- Worker phải xử lý pipeline hoàn chỉnh: load template → build prompt → call API → save result → route to next stage
- Tất cả data lưu trong IndexedDB, không cần kết nối mạng (trừ Gemini API call)
- Batch counters phải được cập nhật realtime

## Non-Goals

- Không implement key rotation (Lite user dùng API key riêng)
- Không implement n8n DataTable sync (không cần, data đã ở IndexedDB)
- Không implement `requires_approval` workflow (chưa cần cho Lite)

## Decisions

### Decision 1: Prompt Variable Delimiters

n8n dùng `%%key%%`, codebase UI dùng `{{key}}`. Worker sẽ hỗ trợ cả hai bằng một regex duy nhất:

```typescript
const regex = /%%\s*([\w_]+)\s*%%|{{\s*([\w_]+)\s*}}/g;
```

**Rationale**: Backward compatible, không ép user đổi template format.

### Decision 2: AI Settings Priority Chain

```
task.extra.ai_settings > template.default_ai_settings > hardcoded defaults
```

Tương tự n8n: Load Batch node merge settings theo thứ tự.

### Decision 3: Stage Key Derivation

Thay vì yêu cầu `stage_key` column mới trên PromptTemplate, derive từ template ID bằng regex giống n8n:

```typescript
function extractStageKey(templateId: string): string {
  // Pattern: {uuid}_{stage_key}_step_{N} hoặc {uuid}_{stage_key}
  const stepMatch = templateId.match(/^[0-9a-fA-F-]+_(.+)_step_\d+$/);
  if (stepMatch) return stepMatch[1];
  const match = templateId.match(/^[0-9a-fA-F-]+_(.+)$/);
  return match ? match[1] : templateId;
}
```

**Update**: Vẫn thêm `stage_key` vào `PromptTemplate` interface để lưu trữ (stageService đã set nó khi sync). Nhưng dùng `extractStageKey()` làm fallback nếu field chưa có.

### Decision 4: Batch Counter Updates

Worker sẽ increment counters trực tiếp trên IndexedDB qua Dexie transaction:

```typescript
async function updateBatchCounters(batchId: string, success: boolean) {
  await db.transaction('rw', db.task_batches, async () => {
    const batch = await db.task_batches.get(batchId);
    if (!batch) return;
    const update: Partial<TaskBatch> = {
      updated_at: new Date().toISOString()
    };
    if (success) {
      update.completed_tasks = (batch.completed_tasks || 0) + 1;
    } else {
      update.failed_tasks = (batch.failed_tasks || 0) + 1;
    }
    // Check if all done
    const total = batch.total_tasks || 0;
    const done = (update.completed_tasks ?? batch.completed_tasks ?? 0)
               + (update.failed_tasks ?? batch.failed_tasks ?? 0);
    if (done >= total && total > 0) {
      update.status = (update.failed_tasks ?? batch.failed_tasks ?? 0) > 0
        ? 'failed' : 'completed';
      update.completed_at = new Date().toISOString();
    }
    await db.task_batches.update(batchId, update);
  });
}
```

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| Schema version bump deletes user data | Dexie auto-migrates; indexes only, no data reformat |
| Worker crash mid-pipeline | Tasks have status tracking; Worker resumes from `plan` status on restart |
| Network error mid-API call | Try-catch marks task as `failed`; user can re-run |

## Open Questions

1. Should we implement `requires_approval` pause logic in the worker? (Currently skipped)
2. Should the worker support `per_batch` split mode or just `per_item`? (Both implemented)
