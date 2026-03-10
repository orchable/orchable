# orchestration Specification

## Purpose
TBD - created by archiving change add-parallel-join. Update Purpose after archive.
## Requirements
### Requirement: Orchestration Parallel Joins
The Orchestration engine SHALL support execution DAG paths where multiple distinct upstream stages converge onto a single downstream stage (Parallel Join). It SHALL ensure the downstream stage is execution-deferred until all declared prerequisite stages are fully resolved.

#### Scenario: Global Parallel Join
- **WHEN** multiple independent upstream stages (e.g., Stage A and Stage B) point to a single target stage (Stage C) configured with `batch_grouping: "global"`.
- **THEN** Stage C's task generation is deferred until ALL instances of both Stage A and Stage B across the entire `launch_id` resolve to either `completed` or `failed`.
- **THEN** a single Stage C task is synthesized, receiving a composite input payload namespaced by the antecedent stage keys (e.g., `{ "StageA": [...], "StageB": [...] }`).

#### Scenario: Isolated (Branch-Level) Parallel Join
- **WHEN** parallel branches originate from a 1:N splitting stage and converge downstream at a target stage configured with `batch_grouping: "isolated"`.
- **THEN** the target stage calculates dependency completion strictly partitioned by the shared lineage tracked in `hierarchy_path` (originating split item).
- **THEN** a discrete target task is spawned per branch lineage exclusively when the internal branch dependencies fulfill the criteria, emitting parallel target tasks corresponding to the original 1:N cardinality.

