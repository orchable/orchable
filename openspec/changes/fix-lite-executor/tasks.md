# Tasks: fix-lite-executor

## 1. Fix Critical Bugs trong Worker

- [x] 1.1 Fix `template.prompt_text` → `template.template` (line 129)
- [x] 1.2 Fix AI settings: đọc từ `template.default_ai_settings`, merge với task-level override
- [x] 1.3 Fix `buildPrompt()`: hỗ trợ cả `%%key%%` và `{{key}}` delimiters
- [x] 1.4 Fix `callGemini()` signature: nhận `AISettings` trực tiếp

## 2. Add Missing Features

- [x] 2.1 Thêm `extractStageKey()` helper (parity với n8n "Determine Next Stage")
- [x] 2.2 Enrich child task metadata: `hierarchy_path`, `launch_id`, `split_group_id`, `prompt_template_id`, `task_type`, `extra`
- [x] 2.3 Add batch counter updates: `updateBatchCounters()` sau mỗi task complete/fail
- [x] 2.4 Add `return-along-with` logic: copy specified input fields vào result

## 3. Update Storage Layer

- [x] 3.1 Add `stage_key` & `created_by` vào `PromptTemplate` interface
- [x] 3.2 Bump Dexie schema version (v5), add `stage_key` index cho prompt_templates
- [x] 3.3 Update `stageService.ts` - sync `stage_key` khi upsert templates

## 4. Verification

- [x] 4.1 TypeScript compile check (`pnpm tsc --noEmit`)
- [ ] 4.2 Manual test: Guest mode, tạo pipeline 2 stages → Launch → verify IndexedDB
- [ ] 4.3 Manual test: Kiểm tra batch counters cập nhật đúng
