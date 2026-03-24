## Context

Moving `cardinality` and associated routing configuration (`split_path`, `split_mode`, `merge_path`, `batch_grouping`) from a Stage-level property to an Edge-level property. This change fundamentally alters how data routing is expressed and executed within the Orchable orchestration DAG.

## Goals / Non-Goals

### Goals
- Enable mixed-cardinality branching (Stage A → 1:N → B, Stage A → 1:1 → C)
- Align data model with DAG semantics: edges describe data flow transformations
- Provide intuitive UI for edge-level configuration in Designer
- Maintain execution correctness for all cardinality types (1:1, 1:N, N:1)

### Non-Goals
- Backward compatibility with existing saved configs (pre-production, not needed)
- Dynamic runtime cardinality (cardinality is always design-time, not computed)
- n8n workflow compatibility (deferred to Phase 7, optional)

## Decisions

### Decision 1: Edge owns ALL routing config
`cardinality`, `split_path`, `split_mode`, `merge_path`, `batch_grouping`, `output_mapping` — ALL move from `StepConfig` to `EdgeConfig`. Stage only produces output; Edge determines how that output is consumed by the target stage.

**Rationale**: `split_path` says "split the OUTPUT of Stage A along path X." Different edges from A might split on different paths (e.g., `result.questions` vs `result.categories`). Same applies to `merge_path` for N:1 edges.

### Decision 2: Persist edges in OrchestratorConfig
Add `edges: EdgeDefinition[]` to `OrchestratorConfig`. Each `EdgeDefinition` contains `{ source, target, edgeConfig }`. This replaces inferring cardinality from individual stage configs.

**Rationale**: Edges already exist in the ReactFlow store and in `steps[].dependsOn`. Adding `edgeConfig` to persisted edges provides a single source of truth for routing.

### Decision 3: Worker outer loop per-edge
Refactor `handleNextStages` from:
```
global cardinality → apply to ALL nexts
```
to:
```
for each edge → apply edge's cardinality to that specific next stage
```

**Rationale**: Each edge independently determines task creation count and data. N:1 on edge A→B can coexist with 1:1 on edge A→C.

### Decision 4: N:1 merge scoped per-edge
When a task completes and an outgoing edge has `cardinality: "many_to_one"`, the merge check (are all siblings done?) applies only to that specific edge. Other edges (e.g., 1:1) process immediately.

**Rationale**: This enables the mixed N:1 + 1:1 case where some downstream stages wait for aggregation while others process immediately.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|-----------|
| ReactFlow edge `data` support | Low — already confirmed `@xyflow/react` supports arbitrary `data` on edges | N/A |
| Designer UX complexity | Med — users now configure edges, not just nodes | Default edge config is `1:1`, which means edges "just work" without explicit config |
| Worker refactoring scope | High — core execution logic changes | Phased approach: types first, then store, then UI, then engine |
| N:1 race condition | Med — two tasks completing simultaneously could both try to create the target | Use existing Dexie transaction pattern, scope per-edge |

## Open Questions

1. Should `output_mapping` remain on StepConfig as well (for the stage's own output format) or move entirely to edge?
2. For the Calculator cost estimation, how do we sum costs when edges have different cardinalities? → Likely iterate edges and multiply by estimated cardinality factor.
