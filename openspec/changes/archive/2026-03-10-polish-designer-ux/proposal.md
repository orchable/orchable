# Change: Polish Designer UX

## Why

A deep UX audit of the `/designer` route identified 3 bugs, 5 UX gaps, and 4 missing features when benchmarked against n8n, Make, Zapier, and Langflow. This change addresses all findings to bring the designer to a polished, production-quality state.

## What Changes

**Bug Fixes:**
- Remove duplicate Cancel button in `SaveConfigDialog.tsx`
- Fix hardcoded MiniMap color logic in `FlowCanvas.tsx` (only 'A'/'B' got color)
- Update `ConfigLibrary.tsx` templates from deprecated `webhookUrl` to modern `task_type` + `stage_key`
- Fix inaccurate note in `RunExecutionDialog.tsx` ("monitor within this dialog" → "redirected to Monitor")

**UX Improvements:**
- Add unsaved-work confirmation guard when loading a config (Library + Recent Configs)
- Add dirty state indicator (`●`) in the toolbar title when canvas has unsaved changes
- Add right-click context menu on nodes (Delete, Duplicate, Configure)
- Add `Ctrl+S` keyboard shortcut for Save
- Clean up import logic in `useImportExport.ts` (remove double-set)

**Code Quality:**
- Minor: no functional refactoring of `StageConfigPanel` (2199 LOC) in this change — tracked separately

## Impact

- Specs: designer
- Code: `SaveConfigDialog.tsx`, `FlowCanvas.tsx`, `ConfigLibrary.tsx`, `RunExecutionDialog.tsx`, `OrchestratorDesigner.tsx`, `StepPalette.tsx`, `useImportExport.ts`, `designerStore.ts`
