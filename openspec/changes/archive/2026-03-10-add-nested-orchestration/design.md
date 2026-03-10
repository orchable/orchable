## Context
Hiện tại, mỗi `OrchestratorConfig` chứa danh sách `StepConfig[]` phẳng. Worker thực thi tuần tự theo DAG dependencies. Hệ thống đã hỗ trợ cardinality `1:1`, `1:N` (split), `N:1` (merge), và Parallel Join.

Yêu cầu mới: cho phép một Stage trong Orchestration A là một Orchestration B hoàn chỉnh. Khi chạy, hệ thống **inline merge** (flatten) các stages con vào pipeline cha, giữ nguyên tư duy "1 orch gồm nhiều stages, stages là blueprint cho tasks".

## Goals / Non-Goals
- **Goals:**
  - Cho phép một Stage trỏ tới `OrchestratorConfig` khác thông qua `sub_orchestration_id`.
  - Resolve Inline Merge tại thời điểm sync (`syncStagesToPromptTemplates`) và trước khi `createLaunch` — flatten pipeline phẳng.
  - Validation: phát hiện stage key collision và circular dependency ngay từ design-time.
  - Designer UI: dropdown chọn sub-orchestration, icon badge, expand/collapse view.
  - Hỗ trợ nested nhiều cấp (A→B→C) với giới hạn `MAX_NESTING_DEPTH = 5`.
- **Non-Goals:**
  - Không tạo child batch riêng (cách tiếp cận Child Batch bị loại bỏ).
  - Không thay đổi `taskExecutor.worker.ts` logic core — pipeline đã flatten hoàn toàn trước khi worker thấy.
  - Không thay đổi cấu trúc DB (IndexedDB schema-less, Supabase không cần columns mới).

## Decisions

### Decision 1: Inline Merge — Flatten tại Resolve Time
Thay vì tạo child batch riêng, hệ thống **flatten** stages con vào pipeline cha tại thời điểm resolve.

```
Input (Design-time):
  orchA.steps = [stageA, stageSub(orchB), stageC]
  orchB.steps = [stageM, stageN]

Output (Resolved pipeline):
  resolvedSteps = [stageA, stageM, stageN, stageC]
  resolvedEdges = [A→M, M→N, N→C]
```

Stages con kế thừa dependency từ stage cha (thay thế vào đúng vị trí). Stage đầu tiên của orchB kế thừa incoming edges của stage cha, stage cuối cùng của orchB kế thừa outgoing edges của stage cha.

### Decision 2: Stage Key Prefix để tránh collision
Khi merge, stage keys của orchestration con được prefix:
```
stageM.stage_key → "sub_orchB__stage_m"
stageN.stage_key → "sub_orchB__stage_n"
```
Convention: `sub_{parentStageKey}__{childStageKey}` (double underscore separator).

**Alternative (được thảo luận):** Không prefix mà validate collision → cảnh báo/block. User có thể dùng stage key unique.

**Quyết định:** Dùng **cả hai**:
1. Validate collision tại design-time, hiển thị warning.
2. Runtime tự động prefix nếu có collision (safety net).
3. Nếu user đảm bảo unique, không prefix (giữ clean keys).

### Decision 3: Circular Dependency Detection
Sử dụng DFS tại design-time khi user chọn sub-orchestration:
```typescript
function detectCircular(configId: string, visited: Set<string>): boolean {
  if (visited.has(configId)) return true; // CYCLE!
  visited.add(configId);
  for (const step of config.steps) {
    if (step.sub_orchestration_id) {
      if (detectCircular(step.sub_orchestration_id, visited)) return true;
    }
  }
  visited.delete(configId); // backtrack
  return false;
}
```
Chạy mỗi khi save orchestration, block save nếu có circular.

### Decision 4: Resolve Function Architecture
Hàm `resolveInlineMerge()` đặt trong `stageService.ts`:

```typescript
interface ResolvedPipeline {
  steps: StepConfig[];
  edges: Array<{ source: string; target: string }>;
  warnings: string[];  // e.g. "Stage key collision detected"
}

async function resolveInlineMerge(
  config: OrchestratorConfig,
  depth?: number
): Promise<ResolvedPipeline>
```

- **Đệ quy**: Nếu stage con cũng chỉ tới sub-orch, resolve tiếp (tối đa `MAX_NESTING_DEPTH`).
- **Trả về**: pipeline phẳng + edges mới + warnings.
- **Input/Output mapping**: Stage đầu tiên của orchB nhận output của stage trước nó trong orchA. Stage cuối cùng của orchB trả output cho stage sau nó trong orchA.

### Decision 5: Worker không thay đổi
Vì pipeline đã được flatten, `processTask`, `handleNextStages`, `handleManyToOne` không cần biết về nested orchestration. Worker chỉ thấy một danh sách stages phẳng + edges bình thường.

### Decision 6: Designer UI
1. **StageConfigPanel**: Khi `task_type = "sub_orchestration"`, ẩn prompt template/AI settings, hiện dropdown chọn orchestration.
2. **FlowCanvas**: Node sub-orch có icon badge (🔗) hoặc border đặc biệt.
3. **Expand/Collapse**:
   - Click "View Detail" → navigate tới OrchestratorDesigner với `configId` = sub_orchestration_id.
   - "Expand All" button → gọi `resolveInlineMerge` → render pipeline phẳng trên canvas (read-only overlay).

## Risks / Trade-offs
- **Stage key collision:** Mitigated qua validation + auto-prefix.
- **Circular dependency:** Chặn tại design-time, safety check tại resolve-time.
- **Performance at resolve:** O(n) với n = tổng stages sau flatten. Chỉ resolve khi save/run, không ảnh hưởng runtime poll loop.
- **Tương thích ngược:** Orch cũ không có `sub_orchestration_id` → resolve trả về pipeline gốc, không ảnh hưởng.

## Migration Plan
Không cần migration DB. `sub_orchestration_id` là optional field mới trên `StepConfig`. Orchestrations hiện tại tiếp tục hoạt động bình thường.

## Open Questions
- **Resolved:** Max nesting depth = 5 (configurable).
- **Resolved:** Error propagation → sub-orch stages fail giống stage bình thường (task-level retry).
- **Resolved:** Cancel propagation → cancel batch = cancel tất cả tasks (đã flatten, nằm trong cùng batch).
- **Lưu ý cho tương lai:** Nếu cần "đợi toàn bộ sub-orch xong mới tiếp" (blocking behavior), có thể dùng N:1 merge stage sau sub-orch stages.
