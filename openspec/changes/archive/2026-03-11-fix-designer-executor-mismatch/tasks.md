## 1. Storage and Tier Logic Fixes
- [x] 1.1 In `StageConfigPanel.tsx`, replace `storage.adapter.constructor.name === "IndexedDBAdapter"` checks with `getAssetStorageAdapter()` to fetch templates, components, and AI models to respect Free/Premium sync rules.
- [x] 1.2 Implement deletion logic for prompt templates in `IndexedDBAdapter` or fallback correctly in `StageConfigPanel` for Free users.

## 2. Component and UI Redundancies
- [x] 2.1 In `StageConfigPanel.tsx`, fix the sub-orchestration selection filter logic from `stageId` to `designerConfig?.id` to correctly prevent selecting the current orchestration.
- [x] 2.2 Relocate the EXPORT Section out of `ContractSection.tsx` into either `Hooks` tab or a separate `Integrations` tab.
- [x] 2.3 Refactor single Save flow: Remove standalone "Save Prompt" to ensure Stage Config and Prompt updates are always committed together atomically.

## 3. Schema and Validation Enhancements
- [x] 3.1 In `ContractSection.tsx`, fix array scope extraction to map `schemaObj.items.properties` correctly so child stages can receive variables from an array of objects output.
- [x] 3.2 In `OutputSchemaEditor.tsx`, add support for generic multidimensional arrays by allowing `items` configuration when the parent is also an array.
- [x] 3.3 In `PromptEditorDialog.tsx`, downgrade "Invalid" red highlight to a "Warning" or "Dynamic" yellow highlight when a variable is not found in `availableScope` but could be provided by pre-processing hooks.

## 4. Execution Engine Alignment
- [x] 4.1 In `taskExecutor.worker.ts`, modify the post-process webhook execution block to respect the `input_source` (`output_only`, `input_and_output`, `custom`) and `custom_input_mapping` settings instead of a hardcoded payload.
- [x] 4.2 In `taskExecutor.worker.ts`, ensure AI models missing from the available list degrade gracefully or fall back to a sensible default if the UI allows a free tier user to (erroneously) select a premium model.
