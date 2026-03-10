# Change: Fix Lite Mode Executor — n8n Workflow Parity

## Why

Web Worker executor (`taskExecutor.worker.ts`) có **4 bug** sẽ gây crash runtime và **4 gap** khiến tính năng Lite Mode không hoạt động đúng so với n8n production pipeline. Người dùng Lite (anonymous & free) không thể chạy pipeline thành công.

## What Changes

### 🔴 Critical Fixes (sẽ crash nếu không sửa)

- **FIX-1**: `template.prompt_text` → `template.template` (field không tồn tại)
- **FIX-2**: AI Settings lấy từ `template.default_ai_settings` thay vì `stageConfig.ai_settings`
- **FIX-3**: Variable substitution hỗ trợ cả `%%key%%` (n8n dialect) lẫn `{{key}}`
- **FIX-4**: `callGemini()` nhận `AISettings` trực tiếp, không phải `Partial<StepConfig>`

### 🟡 Feature Gaps (logic chưa hoàn chỉnh)

- **GAP-5**: Child tasks thiếu metadata (`hierarchy_path`, `launch_id`, `split_group_id`, `prompt_template_id`, `task_type`, `extra`)
- **GAP-6**: Không cập nhật batch counters (`completed_tasks`, `failed_tasks`) trong IndexedDB
- **GAP-7**: `PromptTemplate` thiếu `stage_key` & `created_by` — Worker đọc `.stage_key` nhưng không có field
- **GAP-8**: Thiếu logic `return-along-with` (copy input fields vào result)

## Impact

- **Specs**: Không có formal spec, đây là bug fix change
- **Code**:
  - `src/workers/taskExecutor.worker.ts` — major rewrite
  - `src/lib/storage/StorageAdapter.ts` — add `stage_key`, `created_by` to `PromptTemplate`
  - `src/lib/storage/IndexedDBAdapter.ts` — add `stage_key` index to `prompt_templates`; bump schema version
- **Breaking**: Không. Dexie auto-migrates schema versions.
