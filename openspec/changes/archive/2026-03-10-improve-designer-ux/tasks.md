## 1. Top Toolbar Layout & Header

- [x] 1.1 In `OrchestratorDesigner.tsx`, reorganize the top absolute div into a left group (New, Library) and a right group (Save, Run, Expand, More Actions).
- [x] 1.2 Implement a `DropdownMenu` component for "More Actions" containing: Duplicate, Share, Import, Export.
- [x] 1.3 Add a dynamic title display: "Untitled Orchestration" (if `!config`) or `config.name`.

## 2. "Create New Orchestration" Flow

- [x] 2.1 Replace the `Reset` button with a `New Orchestration` button.
- [x] 2.2 Add an `AlertDialog` to confirm starting a new orchestration if `nodes.length > 2` (or specifically if user has added stage nodes).
- [x] 2.3 On confirm, call `reset()` and clear any selected `configId` from URL params.

## 3. "Duplicate Orchestration" Flow

- [x] 3.1 Create `DuplicateOrchDialog.tsx` that inputs "New Name" and "Stage Key Suffix" (default: `_copy`).
- [x] 3.2 Add a `Duplicate` button in the top right toolbar (disabled if `!config?.id`).
- [x] 3.3 Create a logic function `duplicateOrchestrationToCanvas(suffix)` in `designerStore`.
  - Clone `nodes` and `edges`.
  - Generate new node IDs to ensure React Flow doesn't reuse DOM state improperly.
  - Update `data.stage_key` for all step nodes by appending the suffix.
  - Set `config` to null to make it a new unsaved orchestration.
- [x] 3.4 Wire the dialog to execute the duplication and load it into the canvas.

## 4. "Add Node" UX Improvements

- [x] 4.1 In `StepPalette.tsx`, add a primary "Add Default Node" button that injects a node named "New Stage" into the canvas.
- [x] 4.2 Add logic in `designerStore`'s `addStep` (or create a new action) to place the new node near the center of the viewport or below the last added node.
- [x] 4.3 Relabel the existing input field as "Quick Add (by name)".

## 5. Verification

- [x] 5.1 Verify that clicking "New Orchestration" with a dirty canvas prompts a warning.
- [x] 5.2 Verify that clicking "New Orchestration" on an empty/saved canvas resets immediately.
- [x] 5.3 Verify that clicking "Duplicate" re-renders the canvas with new node IDs, updated stage keys, and clears the active config ID.
- [x] 5.4 Verify clicking "Add Default Node" adds a node to the canvas successfully.
