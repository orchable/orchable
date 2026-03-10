# Change: Improve Designer UX and Workflow

## Why
The current Orchestration Designer interface mixes global actions (like Load, Import, Export) with contextual actions (like Save, Run, Share). The "Reset" button, intended to clear the canvas for a new orchestration, is poorly named and feels destructive rather than creative. The "Add Node" interaction (text input + Enter) is functional but unintuitive for new users. A clearer, more predictable layout is needed to enhance the user experience.

## What Changes
- **RENAMED/REPURPOSED**: "Reset" button is changed to "Create New Orchestration" and given prominent placement.
- **ADDED**: Confirmation dialog when clicking "Create New Orchestration" if there are unsaved changes (nodes > 1).
- **ADDED**: "Duplicate Orchestration" feature. Allows users to clone the current orchestration. Includes a mechanism to automatically suffix/prefix `stage_key`s to ensure readability and prevent collisions across the workspace.
- **MODIFIED**: Top toolbar grouping. Group global actions (Library, New Orchestration) separately from current-config actions. To save space, secondary actions like Import, Export, Share, and Duplicate will be moved into a "More Actions" (or ellipsis/gear) Dropdown Menu.
- **MODIFIED**: "Add Node" interaction. Instead of just a text input, add a clear "Add Node" button that drops a new configurable node onto the center of the canvas. Keep the text input as a quick-add option.
- **ADDED**: Clear visual state for "New / Unsaved Orchestration" vs "Editing: [Name]".

## Impact
- Specs: `specs/designer/spec.md`
- Code: `src/components/designer/OrchestratorDesigner.tsx`, `src/components/designer/StepPalette.tsx`, `src/stores/designerStore.ts`
