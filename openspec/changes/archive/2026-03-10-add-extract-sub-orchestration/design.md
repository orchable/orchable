# Extract Sub-Orchestration — Design

## Context

Tính năng Nested Orchestration (Inline Merge) đã được triển khai (`archive/2026-03-10-add-nested-orchestration`). Hệ thống đã hỗ trợ:
- `StepConfig.sub_orchestration_id` trỏ tới orchestration con
- `resolveInlineMerge()` flatten pipeline tại resolve-time
- `detectCircularDependency()` và `validateStageKeyUniqueness()` validation
- Designer UI: badge, double-click navigate, Expand All view

Yêu cầu mới: cho phép user **select nhiều stages liên thông** trên canvas → **Extract** thành orchestration con mới với một click.

## Goals / Non-Goals

- **Goals:**
  - Multi-select stages trên canvas (Shift+Click hoặc drag area — đã hỗ trợ sẵn bởi ReactFlow)
  - Validate rằng selection tạo thành **connected subgraph**
  - Hiển thị dialog đặt **tên** và **stage key** cho sub-orch node
  - Tự động **save cả orchA (parent) lẫn orchB (extracted)** sau khi extract
  - Rewire edges chính xác: incoming → sub-orch node, sub-orch node → outgoing

- **Non-Goals:**
  - Không hỗ trợ extract stages rời rạc (disconnected) — bắt buộc liên thông
  - Không thay đổi resolve logic (đã hoàn chỉnh)
  - Không thay đổi worker/executor

## Decisions

### Decision 1: Connected Subgraph Validation

Sử dụng BFS/DFS trên induced subgraph (chỉ xét edges giữa các selected nodes) để kiểm tra liên thông:

```typescript
function isConnectedSubgraph(selectedIds: Set<string>, edges: Edge[]): boolean {
  // Build adjacency list from edges within selection
  const adj = new Map<string, string[]>();
  for (const id of selectedIds) adj.set(id, []);

  for (const e of edges) {
    if (selectedIds.has(e.source) && selectedIds.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      adj.get(e.target)!.push(e.source); // undirected for connectivity check
    }
  }

  // BFS from first node
  const visited = new Set<string>();
  const queue = [selectedIds.values().next().value];
  while (queue.length) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    for (const neighbor of adj.get(curr) || []) {
      if (!visited.has(neighbor)) queue.push(neighbor);
    }
  }
  return visited.size === selectedIds.size;
}
```

### Decision 2: Extract Algorithm

```
Input: orchA, selectedNodeIds[], edges[]
Output: orchB (new), orchA (modified)

1. Validate: selectedNodeIds form connected subgraph
2. Partition:
   - internalEdges: cả source và target đều trong selection
   - incomingEdges: source ngoài selection, target trong selection
   - outgoingEdges: source trong selection, target ngoài selection

3. Tạo orchB:
   - steps = selected nodes (giữ nguyên stage_key, task_type, ai_settings, etc.)
   - dependsOn = tính từ internalEdges (remap to stage_key/id within orchB)
   - "Entry" stages (nhận incomingEdges) → dependsOn = [] (root trong orchB)

4. Tạo sub-orch node trong orchA:
   - id = crypto.randomUUID()
   - task_type = "sub_orchestration"
   - sub_orchestration_id = orchB.id
   - stage_key = user-defined (from dialog)
   - dependsOn = sources of incomingEdges (outside nodes)

5. Rewire orchA edges:
   - Remove tất cả edges liên quan đến selected nodes
   - Add edges: sources of incomingEdges → sub-orch node
   - Add edges: sub-orch node → targets of outgoingEdges

6. Remove selected nodes từ orchA
7. Save orchB → Save orchA (auto-save cả hai)
```

### Decision 3: Dialog UI

Dialog xuất hiện khi user click "Create Sub-Orchestration":

- **Name** (required): Tên cho orchestration con mới (e.g., "Core Question Pipeline")
- **Stage Key** (required): Key cho sub-orch node thay thế trong orchA (e.g., "sub_core_questions")
- **Description** (optional): Mô tả ngắn
- Button "Extract & Save" → thực hiện toàn bộ flow

### Decision 4: Auto-Save Flow

Sequence:
1. Tạo `OrchestratorConfig` mới cho orchB → save vào DB (tạo ID)
2. Cập nhật orchA canvas: remove selected nodes, add sub-orch node
3. Save orchA (trigger `useSaveOrchestrator` flow bao gồm `syncStagesToPromptTemplates`)

Sử dụng lại `saveConfig.mutateAsync()` và `updateConfig.mutateAsync()` từ `useConfigs.ts`.

### Decision 5: Trigger UX

Hai cách trigger:
1. **Toolbar button**: Hiện "Create Sub-Orch" button khi ≥2 stepNodes được selected
2. **Right-click context menu** (future): Có thể thêm sau

Phase 1 chỉ làm toolbar button.

## Risks / Trade-offs

- **Edge case: selected nodes bao gồm "start"** → Lọc "start" node ra khỏi selection (không cho extract).
- **Prompt templates đã sync** → templates trỏ tới stages cũ vẫn giữ nguyên vì orchB giữ nguyên stage data. Khi save orchB, `syncStagesToPromptTemplates` sẽ tạo templates cho orchB.
- **Undo** → Không hỗ trợ undo trong phase 1. User có thể manually revert.
- **Tương thích** → Hoàn toàn tương thích vì extract chỉ tạo config mới + set `sub_orchestration_id`, cùng cơ chế đã implement.

## Open Questions

- **Resolved:** Bắt buộc connected subgraph.
- **Resolved:** Dialog đặt tên + stage key ngay lúc extract.
- **Resolved:** Auto-save cả orchA lẫn orchB.
