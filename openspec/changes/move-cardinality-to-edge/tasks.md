## 1. Foundation — Types & Data Model
- [ ] 1.1 Add `EdgeConfig` interface to `src/lib/types.ts`
- [ ] 1.2 Add `EdgeDefinition` interface to `src/lib/types.ts`
- [ ] 1.3 Extend `DesignerEdge` with `data.edgeConfig` in `src/lib/types.ts`
- [ ] 1.4 Add `edges: EdgeDefinition[]` to `OrchestratorConfig` interface
- [ ] 1.5 Remove `cardinality`, `split_path`, `split_mode`, `merge_path`, `batch_grouping` from `StepConfig`
- [ ] 1.6 Remove routing fields from `DEFAULT_STAGE_CONFIG` in `src/lib/constants/defaultStepConfig.ts`

## 2. Designer Store & Persistence
- [ ] 2.1 Update `designerStore.onConnect` to create edges with default `edgeConfig`
- [ ] 2.2 Update `designerStore.loadConfig` to reconstruct edges from `config.edges[]`
- [ ] 2.3 Update `designerStore.duplicateStep` and `duplicateOrchestrationToCanvas` to clone edge configs
- [ ] 2.4 Update `designerStore.replaceNodesWithSubOrch` to preserve edge configs
- [ ] 2.5 Add `updateEdgeData(edgeId, data)` action to designer store
- [ ] 2.6 Update `useConfigs.useSaveOrchestrator.save()` to serialize edge configs into `OrchestratorConfig`
- [ ] 2.7 Remove routing fields from step serialization in `useConfigs.ts`
- [ ] 2.8 Update `useImportExport` to export/import edge configs

## 3. Designer UI — Edge Config Panel
- [ ] 3.1 Create `EdgeConfigPanel.tsx` component with cardinality select, conditional split/merge fields
- [ ] 3.2 Create custom edge component (`CardinalityEdge.tsx`) for visual label display
- [ ] 3.3 Remove cardinality section from `StageConfigPanel.tsx` (~100+ lines)
- [ ] 3.4 Update `FlowCanvas.tsx` to register custom edge type and handle `onEdgeClick`
- [ ] 3.5 Remove cardinality badge from `StepNode.tsx`
- [ ] 3.6 Update `OrchestratorDesigner.tsx` to handle `selectedEdge` state and render `EdgeConfigPanel` in right sidebar

## 4. Stage Service — Prompt Template Sync
- [ ] 4.1 Update `syncStagesToPromptTemplates` to build routing metadata from edge configs
- [ ] 4.2 Remove `stageConfig.cardinality` mapping from stage sync logic

## 5. Execution Engine — Worker & Batch Service
- [ ] 5.1 Update `batchService.createLaunch` to build `next_stage_configs[]` from edge configs
- [ ] 5.2 Remove stage-level cardinality from `current_stage_config` in batchService
- [ ] 5.3 Refactor `handleNextStages` in worker: outer loop per-edge, inner logic per-cardinality
- [ ] 5.4 Update N:1 merge check to be per-edge scoped (atomic transaction)
- [ ] 5.5 Update 1:N split logic to read `split_path`/`split_mode` from per-edge config
- [ ] 5.6 Update hydration logic to read edge config from template metadata

## 6. Peripheral Components
- [ ] 6.1 Update `Launcher.tsx` orchestrationMetadata to read from edge configs
- [ ] 6.2 Update `Calculator.tsx` cost estimation to read cardinality from edges
- [ ] 6.3 Update `AssetLibrary.tsx` template defaults (if applicable)

## 7. n8n Workflows (Optional — May Defer)
- [ ] 7.1 Update `[Base] Base Agent with Key.json` JS code nodes
- [ ] 7.2 Update `[Base] Load Batch - Supabase to n8n.json` stage config mapping

## 8. Verification
- [ ] 8.1 TypeScript compiler pass: `npx tsc --noEmit`
- [ ] 8.2 Manual: Designer roundtrip (create → config edges → save → reload)
- [ ] 8.3 Manual: Mixed 1:N + 1:1 execution test
- [ ] 8.4 Manual: N:1 merge test (last sibling triggers merge)
- [ ] 8.5 Manual: Import/Export roundtrip
