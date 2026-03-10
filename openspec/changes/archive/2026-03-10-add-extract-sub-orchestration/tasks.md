## 1. Core Logic — Extract Utility

- [x] 1.1 Implement `isConnectedSubgraph(selectedIds, edges)` trong `src/services/stageService.ts`
- [x] 1.2 Implement `extractSubOrchestration(selectedNodeIds, allNodes, allEdges)` trong `src/services/stageService.ts`
  - [x] 1.2a Partition edges: internal, incoming, outgoing
  - [x] 1.2b Build orchB config: steps, dependsOn (remap internal)
  - [x] 1.2c Build sub-orch replacement node
  - [x] 1.2d Compute updated orchA nodes + edges (remove selected, add sub-orch, rewire)

## 2. Dialog UI — ExtractSubOrchDialog

- [x] 2.1 Create `src/components/designer/ExtractSubOrchDialog.tsx` [NEW]
  - [x] 2.1a Form fields: name (required), stage_key (required), description (optional)
  - [x] 2.1b Validation: name not empty, stage_key unique within orchA
  - [x] 2.1c Loading state + error handling
- [x] 2.2 Wire dialog to extract logic + auto-save

## 3. Canvas Integration — FlowCanvas

- [x] 3.1 Add toolbar button "Create Sub-Orch" (visible when ≥2 stepNodes selected)
- [x] 3.2 Open `ExtractSubOrchDialog` on button click, passing selectedNodeIds
- [x] 3.3 Validate connected subgraph before opening dialog (show error toast if disconnected)

## 4. Store — designerStore

- [x] 4.1 Add action `replaceNodesWithSubOrch(selectedIds, subOrchNode, newEdges)` to update canvas state

## 5. Auto-Save Flow

- [x] 5.1 Save orchB as new config via `saveConfig.mutateAsync()`
- [x] 5.2 Update orchA canvas (remove + replace nodes/edges)
- [x] 5.3 Save orchA via existing `useSaveOrchestrator` flow (includes `syncStagesToPromptTemplates`)

## 6. Verification

- [x] 6.1 Manual test: Select 2 connected stages → extract → verify orchB created with correct stages
- [x] 6.2 Manual test: Verify orchA has sub-orch node with correct edges
- [x] 6.3 Manual test: Select disconnected stages → verify error toast
- [x] 6.4 Manual test: Double-click sub-orch node → navigate to orchB designer
- [x] 6.5 Manual test: Expand All view → verify orchB stages show inline
