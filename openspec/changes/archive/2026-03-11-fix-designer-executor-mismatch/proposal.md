# Change: Fix Designer Config Panel and Executor Mismatch

## Why
A comprehensive review of the `StageConfigPanel`, its sub-components (`PrePostProcessSection`, `OutputSchemaEditor`, `PromptEditorDialog`), and the core `taskExecutor.worker.ts` revealed multiple discrepancies. These discrepancies cause silent failures, misleading UI states (over-validation, ghost features), and incorrect data syncing tiers for offline/free users. This proposal aligns the UI capabilities precisely with the execution backend and fixes critical data flows.

## What Changes
- Use `getAssetStorageAdapter()` for syncing AI Models, Templates, and Components to respect user tiers correctly.
- Fix circular dependency bypass in sub-orchestration dropdown selection.
- Fix local template deletion failure for Offline/Free users.
- Add support for resolving generic multidimensional arrays (`array of array`) in `OutputSchemaEditor`.
- Update `taskExecutor` to respect `input_source` and `custom_input_mapping` for post-process webhooks, removing the hardcoded payload structure.
- Relax validation rules in `PromptEditorDialog` to account for dynamic variables injected at runtime via pre-process hooks.
- **BREAKING**: Move Stage Export settings from `ContractSection` to a more logical position (e.g., Hooks or a new Integration tab) to avoid confusion.

## Impact
- Specs: `designer`, `orchestrator`
- Code: `src/components/designer/StageConfigPanel.tsx`, `src/components/designer/ContractSection.tsx`, `src/components/designer/PrePostProcessSection.tsx`, `src/components/designer/PromptEditorDialog.tsx`, `src/components/designer/OutputSchemaEditor.tsx`, `src/workers/taskExecutor.worker.ts`
