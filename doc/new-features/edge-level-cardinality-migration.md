# Edge-Level Cardinality Migration Plan

> **Status**: Approved — Tiến hành tạo OpenSpec Proposal
> **Date**: 2026-03-24
> **Scope**: Chuyển `cardinality` (và các thuộc tính routing liên quan) từ thuộc tính của **Stage** sang thuộc tính của **Edge** trong toàn bộ Orchable execution pipeline.

---

## Tại sao cần chuyển đổi?

Hiện tại `cardinality` gắn trên stage → Stage A với `cardinality: 1:N` sẽ **bắn cùng kiểu** cho TẤT CẢ targets (B, D). Không thể `1:N → B` nhưng `1:1 → D` trừ khi tách Stage A thành 2 stage riêng.

**Edge-level cardinality** cho phép mỗi connection (edge) giữa 2 stages có cardinality riêng, mở khóa mixed-cardinality branching mà không cần workaround.

---

## Nguyên tắc thiết kế cốt lõi

### Stage chỉ sản xuất output. Edge quyết định routing.

| Khái niệm | Thuộc về | Lý do |
|-----------|---------|-------|
| `cardinality` | **Edge** | Cùng 1 output, edge A→B có thể split nhưng edge A→C không |
| `split_path` | **Edge** | Edge A→B split theo `questions`, edge A→D split theo `categories` |
| `split_mode` | **Edge** | Edge A→B dùng `per_item`, edge A→E dùng `per_batch` |
| `merge_path` | **Edge** | Edge X→Y merge `output_data`, edge Z→Y merge `scores` |
| `output_mapping` | **Edge** | Mỗi edge có thể map output khác nhau |
| `batch_grouping` | **Edge** | Edge-level merge scope (global vs batch) |

### Chiều tác động khác nhau theo cardinality type

```
1:N on edge A→B:  Source A split OUTPUT đi ra   → B nhận fragments
1:1 on edge A→B:  Pass-through                  → B nhận full result  
N:1 on edge A→B:  Target B yêu cầu MERGE INPUT ← A phải chờ siblings xong
```

---

## Execution Semantics — Ví dụ chi tiết

### Case 1: Mixed cardinality — 1:N + 1:1

```
Input (Unified) → A → [1:N, split_path: result.questions] → B
                    → [1:1]                                → C
```

Stage A output: `{ result: { summary: "...", questions: [Q1..Q5] } }`

- **Edge A→B (1:N)**: Extract `result.questions` → tạo **5 tasks** cho B
- **Edge A→C (1:1)**: Pass full result → tạo **1 task** cho C

### Case 2: Fan-in — N:1

```
Input (5 TSV rows) → A (5 tasks) → [N:1, merge_path: output_data] → B (1 task)
```

Worker xử lý:
| Sự kiện | Edge A→B check | Quyết định |
|---------|----------------|------------|
| A₁ done | A₂..A₅ chưa xong | ❌ Chờ |
| A₂ done | A₃..A₅ chưa xong | ❌ Chờ |
| A₃..A₄ done | A₅ chưa xong | ❌ Chờ |
| A₅ done | Tất cả done ✅ | ✅ Aggregate outputs → Tạo 1 task B |

### Case 3: Mixed — N:1 + 1:1 (sức mạnh của per-edge)

```
Input (5 rows) → A (5 tasks)
    Edge A→B: N:1  (merge → 1 B task)
    Edge A→C: 1:1  (5 C tasks, tạo ngay)
```

Khi mỗi A task completes:
- **Edge A→B (N:1)**: Check siblings → chỉ tạo B khi task cuối xong
- **Edge A→C (1:1)**: Tạo C ngay lập tức với output của A task đó

**Kết quả**: C₁..C₅ chạy song song, B chờ merge. Stage-level model **không thể** express được use case này.

---

## Impact Map — Files bị ảnh hưởng

| Layer | File | Mức ảnh hưởng | Thay đổi chính |
|-------|------|---------------|----------------|
| **Types** | `src/lib/types.ts` | 🔴 High | Mở rộng `DesignerEdge`, thêm `EdgeConfig`; xóa `cardinality` khỏi `StepConfig` & `StageConfig` |
| **Designer Store** | `src/stores/designerStore.ts` | 🔴 High | Edges carry `data.edgeConfig`; `loadConfig` reconstruct edges with config |
| **Designer UI** | `src/components/designer/StageConfigPanel.tsx` | 🔴 High | Xóa cardinality section khỏi stage form → cần component mới `EdgeConfigPanel` |
| **Designer UI** | `src/components/designer/StepNode.tsx` | 🟡 Med | Xóa cardinality badge; edge labels thay thế |
| **Designer UI** | `src/components/designer/FlowCanvas.tsx` | 🟡 Med | Custom edge component hiển thị cardinality trên edge |
| **Stage Service** | `src/services/stageService.ts` | 🔴 High | `syncStagesToPromptTemplates` đọc cardinality từ edges thay vì stages |
| **Batch Service** | `src/services/batchService.ts` | 🔴 High | `createLaunch` build `next_stage_configs` từ edge config |
| **Worker** | `src/workers/taskExecutor.worker.ts` | 🔴 High | `handleNextStages` refactor: outer loop per-edge, inner logic per-cardinality |
| **Launcher** | `src/pages/Launcher.tsx` | 🟡 Med | `orchestrationMetadata` đọc từ edge thay vì `nextStage.cardinality` |
| **Calculator** | `src/pages/Calculator.tsx` | 🟡 Med | Cost estimation đọc cardinality từ edge |
| **Hooks** | `src/hooks/useConfigs.ts` | 🟡 Med | Save logic serialize edge config thay vì stage cardinality |
| **Hooks** | `src/hooks/useImportExport.ts` | 🟡 Med | Export/Import include edge configs |
| **DB** | `prompt_templates.stage_config` | 🟡 Med | Xóa `cardinality` khỏi JSONB; routing data trong `next_stage_configs` |
| **Constants** | `src/lib/constants/defaultStepConfig.ts` | 🟢 Low | Xóa `cardinality` từ default |
| **n8n** | `src/n8n/workflows/*.json` | 🟡 Med | Update JS code nodes đọc cardinality từ edge config |

---

## Kiến trúc mới

### Data Model

```typescript
// Edge-level routing config
interface EdgeConfig {
  cardinality: "one_to_one" | "one_to_many" | "many_to_one";
  // 1:N specific
  split_path?: string;          // e.g. "result.questions"
  split_mode?: "per_item" | "per_batch";
  batch_size?: number;
  // N:1 specific
  merge_path?: string;          // e.g. "output_data"
  batch_grouping?: "global" | "isolated";
  // Common
  output_mapping?: string;      // e.g. "result"
}

// DesignerEdge mở rộng (ReactFlow + config)
interface DesignerEdge {
  id: string;
  source: string;
  target: string;
  data?: {
    edgeConfig: EdgeConfig;
  };
}

// OrchestratorConfig thêm edges array
interface OrchestratorConfig {
  // ... existing fields
  steps: StepConfig[];      // cardinality REMOVED from here
  edges: EdgeDefinition[];  // NEW: persisted edge configs
}

interface EdgeDefinition {
  source: string;  // step ID
  target: string;  // step ID
  edgeConfig: EdgeConfig;
}
```

### Worker handleNextStages — Refactored Pseudo-code

```typescript
async function handleNextStages(task, result, template) {
  const nextStageConfigs = getNextStageConfigs(task, template);

  // OUTER LOOP: per-edge (thay vì global cardinality)
  for (const edgeConfig of nextStageConfigs) {
    const { cardinality, split_path, split_mode, merge_path } = edgeConfig;

    if (cardinality === "many_to_one") {
      // N:1 — Check if ALL siblings done, then aggregate
      const siblings = await getSiblingTasks(task.stage_key, task.batch_id);
      const allDone = siblings.every(s =>
        s.id === task.id || s.status === "completed" || s.status === "failed"
      );
      if (!allDone) continue; // ← CHỜ, không tạo task

      const allOutputs = siblings
        .filter(s => s.status === "completed")
        .map(s => extractByPath(s.output_data, merge_path));
      await createTask(edgeConfig, { merged_results: allOutputs });

    } else if (cardinality === "one_to_many") {
      // 1:N — Split output theo edge's split_path → N tasks
      const items = extractByPath(result, split_path);
      for (let i = 0; i < items.length; i++) {
        await createTask(edgeConfig, {
          item: items[i], _split_index: i, _split_total: items.length
        });
      }

    } else {
      // 1:1 — Pass full result → 1 task
      await createTask(edgeConfig, result);
    }
  }
}
```

### Lưu trữ

```
OrchestratorConfig.steps[].cardinality     → XÓA
OrchestratorConfig.steps[].split_path      → XÓA (move to edge)
OrchestratorConfig.steps[].split_mode      → XÓA (move to edge)
OrchestratorConfig.steps[].merge_path      → XÓA (move to edge)
OrchestratorConfig.steps[].batch_grouping  → XÓA (move to edge)

OrchestratorConfig.edges[]                 → MỚI (array of EdgeDefinition)

prompt_templates.stage_config.cardinality  → XÓA
→ Routing lives in task.extra.next_stage_configs[i] (runtime, per-edge)
```

---

## Phân chia giai đoạn

### Giai đoạn 1: Types & Data Model (Foundation)
> **Mục tiêu**: Thiết lập type system mới, xóa routing config khỏi stage types

**Files thay đổi**:
1. `src/lib/types.ts` — Thêm `EdgeConfig`, `EdgeDefinition`, mở rộng `DesignerEdge`, xóa routing fields từ `StepConfig`
2. `src/lib/constants/defaultStepConfig.ts` — Xóa routing fields

**Deliverable**: TypeScript compiler pass (downstream breaks expected, fixed in subsequent phases)

---

### Giai đoạn 2: Designer Store & Edge Data
> **Mục tiêu**: Edges carry `EdgeConfig`; save/load roundtrip hoạt động

**Files thay đổi**:
1. `src/stores/designerStore.ts`
   - `onConnect`: Tạo edge với default `edgeConfig: { cardinality: "one_to_one" }`
   - `loadConfig`: Reconstruct edges từ `config.edges[]` (mảng mới)
   - `duplicateStep`, `duplicateOrchestrationToCanvas`: Clone edge configs
   - `replaceNodesWithSubOrch`: Preserve edge configs
2. `src/hooks/useConfigs.ts`
   - `useSaveOrchestrator.save()`: Serialize edges array vào `OrchestratorConfig`
   - Xóa routing fields từ step serialization
3. `src/hooks/useImportExport.ts`
   - Export/Import include edge configs

**Deliverable**: Save → Load roundtrip giữ đúng edge configs.

---

### Giai đoạn 3: Designer UI — Edge Config Panel
> **Mục tiêu**: User click edge để config cardinality

**Files thay đổi**:
1. `src/components/designer/StageConfigPanel.tsx` — **XÓA** cardinality section (~100+ lines)
2. `src/components/designer/EdgeConfigPanel.tsx` — **MỚI**
3. `src/components/designer/FlowCanvas.tsx` — Custom edge component + `onEdgeClick`
4. `src/components/designer/StepNode.tsx` — Xóa cardinality badge
5. `src/components/designer/OrchestratorDesigner.tsx` — Handle `selectedEdge` + right sidebar routing

**Deliverable**: UI complete — user config cardinality on edges.

---

### Giai đoạn 4: Stage Service — Prompt Template Sync
> **Mục tiêu**: `syncStagesToPromptTemplates` đọc routing từ edges

**Files thay đổi**:
1. `src/services/stageService.ts` — Build `next_stage_configs` từ edge configs, không từ stage config

**Deliverable**: Prompt templates no longer contain stage-level cardinality.

---

### Giai đoạn 5: Execution Engine — Worker & Batch Service
> **Mục tiêu**: Runtime per-edge routing — cốt lõi của migration

**Files thay đổi**:
1. `src/services/batchService.ts` — Build `next_stage_configs[]` từ edge configs
2. `src/workers/taskExecutor.worker.ts` — Refactor `handleNextStages`:
   - **Đảo cấu trúc**: Outer loop per-edge, inner logic per-cardinality
   - **N:1 per-edge**: Merge check scoped per-edge, tạo target task khi tất cả siblings done
   - **1:N per-edge**: Split theo edge's `split_path`, tạo N tasks
   - **1:1 per-edge**: Pass-through, tạo 1 task
   - Atomicity via transaction để prevent race condition khi N:1 merge

**Deliverable**: Mixed-cardinality branching works end-to-end.

---

### Giai đoạn 6: Peripheral Components
> **Mục tiêu**: Cập nhật components phụ

**Files**: `Launcher.tsx`, `Calculator.tsx`, `AssetLibrary.tsx`

**Deliverable**: All pages compile clean.

---

### Giai đoạn 7: n8n Workflows (Optional/Deferrable)
> **Files**: `[Base] Base Agent with Key.json`, `[Base] Load Batch*.json`

---

## Verification Plan

### Automated
- `npx tsc --noEmit` phải pass clean

### Manual Testing
1. **Designer roundtrip**: Create → config edges → Save → Reload → verify
2. **Mixed 1:N + 1:1**: Stage A→[1:N]→B, A→[1:1]→C → validate split vs pass-through
3. **N:1 merge**: Input(5 rows)→A(5 tasks)→[N:1]→B(1 task) → validate merge chỉ xảy ra khi A cuối cùng done
4. **Mixed N:1 + 1:1**: A→[N:1]→B, A→[1:1]→C → C tasks tạo ngay, B task chờ merge
5. **Import/Export**: JSON roundtrip preserves edge configs

---

## Timeline ước tính

| Giai đoạn | Effort | Dependency |
|-----------|--------|------------|
| 1. Types & Data Model | 0.5 ngày | — |
| 2. Designer Store | 1 ngày | GĐ 1 |
| 3. Designer UI | 1.5 ngày | GĐ 2 |
| 4. Stage Service | 0.5 ngày | GĐ 1 |
| 5. Execution Engine | 1 ngày | GĐ 4 |
| 6. Peripheral | 0.5 ngày | GĐ 1 |
| 7. n8n (optional) | 0.5 ngày | GĐ 5 |
| **Tổng** | **~5 ngày** | |

---

## Rủi ro & Mitigation

| Rủi ro | Mitigation |
|--------|-----------|
| ReactFlow edge `data` limitations | Đã verify: `@xyflow/react` supports `data` on edges |
| Existing saved configs break | Không cần backward compat — clean migration |
| N:1 race condition | Dùng Dexie transaction (existing pattern), scope per-edge |
| n8n desync | Defer GĐ 7; document breaking change |
