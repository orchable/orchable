# Change: Hỗ trợ Nested Orchestration (Sub-Orchestration dạng Inline Merge)

## Why
Hiện tại, mỗi Stage trong Orchestration chỉ có thể chạy **một lệnh AI duy nhất** (hoặc webhook). Khi pipeline trở nên phức tạp, người dùng muốn **tái sử dụng** (reuse) một Orchestration đã được thiết kế sẵn làm "nội dung" cho một Stage trong Orchestration khác.

Ví dụ: Orchestration A có Stage B, và Stage B thực chất là Orchestration B (gồm Stage M → Stage N). Khi chạy, hệ thống sẽ **tự động flatten** (inline merge) các stage của Orchestration B vào vị trí Stage B trong pipeline A, tạo thành luồng: `Stage A → Stage M → Stage N → Stage C`.

## What Changes
- **ADDED**: `StepConfig` hỗ trợ `task_type: "sub_orchestration"` với trường `sub_orchestration_id` trỏ tới một `OrchestratorConfig` khác.
- **MODIFIED**: `syncStagesToPromptTemplates` (stageService) resolve các sub-orchestration qua Inline Merge: flatten toàn bộ stages con vào pipeline cha, kế thừa edges/dependencies.
- **ADDED**: Validation phát hiện stage key trùng lặp và circular dependency (A→B→A) tại design-time và runtime.
- **MODIFIED**: `batchService.createLaunch` gọi resolve trước khi tạo batch, đảm bảo pipeline phẳng hoàn chỉnh.
- **MODIFIED**: Designer UI thêm dropdown chọn sub-orchestration cho một Stage, hiển thị icon badge cho sub-orch node.
- **ADDED**: "Expand All" view trên Designer canvas hiển thị pipeline phẳng hóa đầy đủ.

## Impact
- Specs: `specs/orchestration/spec.md` (nếu đã có)
- Code:
  - `src/lib/types.ts` — Thêm fields vào `StepConfig`
  - `src/services/stageService.ts` — Inline merge resolve & validation
  - `src/services/batchService.ts` — Gọi resolve pipeline trước createLaunch
  - `src/components/designer/StageConfigPanel.tsx` — UI chọn sub-orchestration
  - `src/components/designer/FlowCanvas.tsx` — Badge icon cho sub-orch node
  - `src/stores/designerStore.ts` — State quản lý expand/collapse
