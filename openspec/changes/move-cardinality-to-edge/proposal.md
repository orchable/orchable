# Change: Move Cardinality from Stage to Edge

## Why
Cardinality (1:1, 1:N, N:1) is currently a property of Stage, which forces all outgoing edges from a stage to share the same routing behavior. This prevents mixed-cardinality branching (e.g., Stage A → 1:N → B and Stage A → 1:1 → C simultaneously) without workaround stage duplication. Moving cardinality and its associated routing config (`split_path`, `split_mode`, `merge_path`, `batch_grouping`) to the Edge level enables per-edge routing decisions, aligns with DAG semantics, and simplifies complex workflow authoring.

## What Changes
- **BREAKING**: `StepConfig.cardinality`, `StepConfig.split_path`, `StepConfig.split_mode`, `StepConfig.merge_path`, `StepConfig.batch_grouping` are removed from stage/step configuration
- **BREAKING**: `OrchestratorConfig` gains a new `edges: EdgeDefinition[]` array that persists routing config per-edge
- **BREAKING**: Existing saved orchestrator configs are incompatible (no backward compat needed — pre-production)
- New `EdgeConfig` type defines per-edge routing: `cardinality`, `split_path`, `split_mode`, `merge_path`, `batch_grouping`, `output_mapping`
- Designer UI: cardinality configured by clicking edges (new `EdgeConfigPanel`), removed from `StageConfigPanel`
- Worker `handleNextStages` refactored: outer loop per-edge, inner logic per-cardinality type
- `batchService.createLaunch` builds `next_stage_configs[]` from edge configs instead of stage configs
- `syncStagesToPromptTemplates` reads routing from edges instead of stages

## Impact
- Specs: `orchestration`, `orchestrator`, `designer`
- Code: `types.ts`, `designerStore.ts`, `StageConfigPanel.tsx`, `EdgeConfigPanel.tsx` (new), `FlowCanvas.tsx`, `StepNode.tsx`, `OrchestratorDesigner.tsx`, `stageService.ts`, `batchService.ts`, `taskExecutor.worker.ts`, `useConfigs.ts`, `useImportExport.ts`, `Launcher.tsx`, `Calculator.tsx`, `defaultStepConfig.ts`
