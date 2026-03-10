## 1. Bug Fixes (Quick Wins)

- [x] 1.1 Remove duplicate Cancel button in `SaveConfigDialog.tsx` (line 68)
- [x] 1.2 Fix MiniMap `nodeColor` in `FlowCanvas.tsx` to use configured status instead of hardcoded names
- [x] 1.3 Update 3 hardcoded templates in `ConfigLibrary.tsx` from `webhookUrl` to `task_type` + `stage_key`
- [x] 1.4 Fix inaccurate note in `RunExecutionDialog.tsx` ("monitor within this dialog" → "redirected to Monitor")

## 2. Unsaved Work Guard

- [x] 2.1 Add `hasUnsavedWork()` helper or computed value in `designerStore.ts`
- [x] 2.2 Wrap `ConfigLibrary.handleLoadConfig()` with unsaved-work confirmation dialog
- [x] 2.3 Wrap `StepPalette` recent config click with unsaved-work confirmation dialog

## 3. Dirty State Indicator

- [x] 3.1 Add `isDirty` logic to `designerStore.ts` (compare current state vs saved config)
- [x] 3.2 Show `●` dot in toolbar title in `OrchestratorDesigner.tsx` when dirty

## 4. Right-Click Context Menu

- [x] 4.1 Install/verify `@radix-ui/react-context-menu` is available (or use shadcn context-menu)
- [x] 4.2 Wrap `StepNode` with `ContextMenu` providing: Configure, Duplicate, Delete
- [x] 4.3 Wire Delete action with confirmation dialog
- [x] 4.4 Wire Duplicate action to `designerStore.duplicateStep()`
- [x] 4.5 Wire Configure action to `setSelectedNode()`

## 5. Keyboard Shortcuts

- [x] 5.1 Add `Ctrl+S` / `Cmd+S` handler in `OrchestratorDesigner.tsx` to trigger save

## 6. Import Logic Cleanup

- [x] 6.1 Refactor `useImportExport.handleImport()` to avoid double-set (`loadConfig` + `setState`)

## 7. Verification

- [x] 7.1 `pnpm tsc --noEmit` passes
- [x] 7.2 `openspec validate polish-designer-ux --strict` passes
- [x] 7.3 Manual: Open Save dialog → verify single Cancel button
- [x] 7.4 Manual: Check MiniMap colors match configured/unconfigured status
- [x] 7.5 Manual: Load a config from Library while canvas has unsaved work → confirmation appears
- [x] 7.6 Manual: Right-click a node → context menu shows actions
- [x] 7.7 Manual: Press `Ctrl+S` → Save dialog opens
- [x] 7.8 Manual: Edit canvas → `●` appears in title; save → `●` disappears
