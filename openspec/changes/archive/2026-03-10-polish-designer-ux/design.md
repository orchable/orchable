## Context

This change addresses all findings from the Designer UX deep audit. The changes range from trivial bug fixes to medium-complexity UX additions.

## Goals

- Fix all identified bugs (duplicate button, hardcoded colors, deprecated templates, inaccurate text)
- Add safety guards for data loss scenarios (load-over-unsaved-work)
- Add standard UX features expected in visual pipeline builders (context menu, keyboard shortcuts, dirty indicator)

## Non-Goals

- Full refactoring of `StageConfigPanel.tsx` (2199 LOC) — tracked separately
- Undo/Redo system — requires significant state architecture (history stack in zustand)
- Auto-connect new stages to selected node — can be done in a follow-up

## Decisions

### Dirty State Detection
- Compare current `nodes`/`edges` state against the last saved `config` state
- Use a simple `isDirty` computed value: `nodes.length > 1 && !config?.id` OR `config` exists but canvas differs from saved
- Display `●` dot before the orchestration name in the toolbar

### Unsaved Work Guard
- Reuse the existing `AlertDialog` pattern from "New Orchestration"
- Apply to: `ConfigLibrary.handleLoadConfig()`, `StepPalette` recent config click
- Skip if canvas only has the start node (same logic as "New" button)

### Right-Click Context Menu
- Use Radix `ContextMenu` component on `StepNode`
- Actions: Configure (select node), Duplicate, Delete (with confirm)
- Not available on `StartNode` (undeletable)

### MiniMap Color Strategy
- Green for `startNode`
- Blue for configured nodes (`task_type` is set)
- Gray for unconfigured nodes

## Risks / Trade-offs

- Adding a guard on load-config means 1 extra click for users who frequently switch configs. Acceptable given the data-loss protection it provides.
- Context menu on nodes may conflict with browser's native right-click menu; Radix handles this correctly via `onContextMenu` preventDefault.
