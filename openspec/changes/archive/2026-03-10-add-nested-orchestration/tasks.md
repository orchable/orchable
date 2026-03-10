## 1. Types & Data Model
- [x] 1.1 Thêm `sub_orchestration_id?: string` vào `StepConfig` trong `src/lib/types.ts`
- [x] 1.2 Thêm `sub_orchestration_output_path?: string` vào `StepConfig`

## 2. Resolve Pipeline (Core Logic)
- [x] 2.1 Tạo hàm `resolveInlineMerge(config, depth?)` trong `src/services/stageService.ts`
  - [x] 2.1a Load sub-orchestration config
  - [x] 2.1b Flatten stages con vào pipeline cha (thay thế stage sub-orch)
  - [x] 2.1c Rewire edges: incoming edges → first sub-stage, last sub-stage → outgoing edges
  - [x] 2.1d Xử lý stage key prefix/collision detection
  - [x] 2.1e Đệ quy resolve nhiều cấp (max depth = 5)
- [x] 2.2 Tạo hàm `detectCircularDependency(configId, visited?)` trong `stageService.ts`
- [x] 2.3 Tạo hàm `validateStageKeyUniqueness(resolvedSteps)` trong `stageService.ts`

## 3. Integrate Resolve vào Pipeline
- [x] 3.1 Cập nhật `syncStagesToPromptTemplates` gọi `resolveInlineMerge` trước khi sync
- [x] 3.2 Cập nhật `batchService.createLaunch` gọi `resolveInlineMerge` trước khi tạo batch
- [x] 3.3 Đảm bảo `topologicalSortStages` hoạt động trên resolved pipeline

## 4. Designer UI — StageConfigPanel
- [x] 4.1 Thêm task_type option "Sub-Orchestration" vào dropdown
- [x] 4.2 Khi chọn "Sub-Orchestration": ẩn prompt template, AI settings; hiện dropdown chọn orchestration
- [x] 4.3 Khi chọn orchestration, chạy `detectCircularDependency` → hiện error nếu có cycle
- [x] 4.4 Chạy `validateStageKeyUniqueness` → hiện warning nếu có collision

## 5. Designer UI — FlowCanvas
- [x] 5.1 Badge icon cho sub-orchestration node (icon 🔗 hoặc border đặc biệt)
- [x] 5.2 Double-click sub-orch node → navigate tới OrchestratorDesigner?configId=sub_orchestration_id

## 6. Designer UI — Expand All View
- [x] 6.1 Thêm "Expand All" button vào toolbar
- [x] 6.2 Gọi `resolveInlineMerge` → render pipeline phẳng trên canvas (read-only)
- [x] 6.3 Collapse back → return to normal view

## 7. Verification
- [x] 7.1 Manual test: Tạo orchB (M→N), tạo orchA (A→sub(B)→C), save, verify sync tạo đúng templates
- [x] 7.2 Manual test: Run orchA, verify tasks chạy qua A→M→N→C
- [x] 7.3 Manual test: Circular dependency detection (orchA → orchB → orchA) → blocked
- [x] 7.4 Manual test: Stage key collision warning
- [x] 7.5 Manual test: Expand All view hiển thị pipeline phẳng
