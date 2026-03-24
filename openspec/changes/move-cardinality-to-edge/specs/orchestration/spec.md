## MODIFIED Requirements

### Requirement: Orchestration Parallel Joins
The Orchestration engine SHALL support execution DAG paths where multiple distinct upstream stages converge onto a single downstream stage (Parallel Join). Cardinality and merge behavior SHALL be defined per-edge rather than per-stage. The engine SHALL evaluate each outgoing edge independently: N:1 edges defer task creation until all source siblings complete, while 1:1 edges create tasks immediately.

#### Scenario: Global Parallel Join
- **WHEN** multiple independent upstream stages (e.g., Stage A and Stage B) have edges pointing to a single target stage (Stage C), each edge configured with `cardinality: "many_to_one"` and `batch_grouping: "global"`.
- **THEN** Stage C's task generation is deferred until ALL instances of both Stage A and Stage B across the entire `launch_id` resolve to either `completed` or `failed`.
- **THEN** a single Stage C task is synthesized, receiving a composite input payload namespaced by the antecedent stage keys (e.g., `{ "StageA": [...], "StageB": [...] }`).

#### Scenario: Isolated (Branch-Level) Parallel Join
- **WHEN** parallel branches originate from a 1:N splitting edge and converge downstream at a target stage whose incoming edges are configured with `cardinality: "many_to_one"` and `batch_grouping: "isolated"`.
- **THEN** the target stage calculates dependency completion strictly partitioned by the shared lineage tracked in `hierarchy_path` (originating split item).
- **THEN** a discrete target task is spawned per branch lineage exclusively when the internal branch dependencies fulfill the criteria, emitting parallel target tasks corresponding to the original 1:N cardinality.

#### Scenario: Mixed cardinality outgoing edges
- **WHEN** Stage A has two outgoing edges: edge A→B with `cardinality: "one_to_many"` and edge A→C with `cardinality: "one_to_one"`.
- **AND** Stage A completes with an output containing a splittable array at the path configured in edge A→B's `split_path`.
- **THEN** the engine creates N tasks for Stage B (one per split item) AND 1 task for Stage C (receiving the full output).
- **AND** both sets of tasks execute independently.

#### Scenario: Mixed N:1 and 1:1 outgoing edges
- **WHEN** Stage A (with 5 tasks from input split) has two outgoing edges: edge A→B with `cardinality: "many_to_one"` and edge A→C with `cardinality: "one_to_one"`.
- **AND** an individual Stage A task completes.
- **THEN** the engine immediately creates a corresponding Stage C task (1:1) with the completed task's output.
- **AND** for edge A→B (N:1), the engine checks if all Stage A siblings are done; only when the last sibling completes does it aggregate all outputs and create a single Stage B task.

## ADDED Requirements

### Requirement: Per-Edge Routing Configuration
The Orchestration engine SHALL read all routing parameters (`cardinality`, `split_path`, `split_mode`, `merge_path`, `batch_grouping`, `output_mapping`) from the edge configuration rather than from the source stage configuration. Each edge SHALL independently determine how data flows from source to target.

#### Scenario: Edge-specific split path
- **WHEN** Stage A has two outgoing 1:N edges: edge A→B with `split_path: "result.questions"` and edge A→D with `split_path: "result.categories"`.
- **AND** Stage A completes with an output containing both arrays.
- **THEN** the engine creates tasks for Stage B by splitting on `result.questions` AND creates tasks for Stage D by splitting on `result.categories`, independently.

#### Scenario: Edge-specific merge path
- **WHEN** two N:1 edges converge on Stage C: edge A→C with `merge_path: "output_data"` and edge B→C with `merge_path: "scores"`.
- **AND** all Stage A and Stage B tasks complete.
- **THEN** Stage C receives a merged input with data aggregated according to each edge's respective `merge_path`.
