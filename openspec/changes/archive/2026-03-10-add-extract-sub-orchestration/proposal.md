# Change: Extract Sub-Orchestration từ các Stages đã chọn

## Why

Sau khi có Nested Orchestration (Inline Merge), người dùng cần một cách nhanh để **tách (extract)** một nhóm stages liên thông thành orchestration con — tương tự "Extract Method" trong code refactoring. Hiện tại, muốn tạo sub-orchestration, user phải tay tạo một orch mới rồi quay lại orch gốc để set stage type = sub_orchestration. Flow này cần được tự động hóa.

## What Changes

- **ADDED**: `extractSubOrchestration(selectedNodeIds)` utility trong `src/services/stageService.ts` — validate liên thông, tách stages, rewire edges.
- **ADDED**: `ExtractSubOrchDialog.tsx` — Dialog để user đặt tên + stage key cho sub-orch node mới.
- **MODIFIED**: `FlowCanvas.tsx` — Thêm context menu / toolbar button "Create Sub-Orchestration" khi có ≥2 nodes được chọn.
- **MODIFIED**: `designerStore.ts` — Thêm action `replaceNodesWithSubOrch(selectedIds, newOrchConfig, stageKey)` để cập nhật canvas.
- **MODIFIED**: `useConfigs.ts` — Tái sử dụng `useSaveOrchestrator` logic để auto-save cả orchA lẫn orchB.

## Impact

- Specs: Dựa trên `add-nested-orchestration` (archived `2026-03-10`).
- Code:
  - `src/services/stageService.ts` — Extract logic + validation
  - `src/components/designer/ExtractSubOrchDialog.tsx` — [NEW] Dialog UI
  - `src/components/designer/FlowCanvas.tsx` — Context menu trigger
  - `src/stores/designerStore.ts` — Store action
  - `src/hooks/useConfigs.ts` — Auto-save flow
