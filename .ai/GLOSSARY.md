# Orchable Glossary

## Core Concepts

| Term | Description |
| --- | --- |
| **Orchestration** | A reusable pipeline of Stages (DAG) that defines an AI workflow |
| **OrchestratorConfig** | The saved configuration containing all stages, edges, and settings |
| **Stage** | One step in an orchestration — has a prompt template, AI settings, cardinality |
| **StepConfig** | The TypeScript type for a stage's configuration |
| **Stage Key** | Unique lowercase identifier for a stage within an orchestration (e.g., `qgen`, `formatter`) |

## Execution

| Term | Description |
| --- | --- |
| **Batch** (`task_batches`) | A single execution run of an orchestration with input data |
| **Launch** | The process of creating a batch + initial tasks for execution |
| **Task** (`ai_tasks`) | A single work item — one stage applied to one input |
| **Task Executor** | Web Worker (`taskExecutor.worker.ts`) that polls and processes tasks |
| **Cardinality** | How a stage maps inputs to outputs: `1:1`, `1:N` (split), `N:1` (merge) |
| **Parallel Join** | DAG merge where a stage waits for multiple upstream stages to complete |
| **Split Group** | Group of tasks created from a `1:N` split, sharing `split_group_id` |
| **Hierarchy Path** | Array of parent task IDs tracking task lineage through the DAG |

## AI / Providers

| Term | Description |
| --- | --- |
| **BYOK** | Bring Your Own Key — users provide their own API keys |
| **Key Pool** | Server-managed free-tier keys (Supabase proxy) |
| **KeyManager** | Worker-level key rotation, health tracking, and rate limiting |
| **Prompt Template** | Stored template with variables, synced from stage config |

## Storage

| Term | Description |
| --- | --- |
| **Dual-Tier** | Free=IndexedDB, Premium=Supabase |
| **StorageAdapter** | Abstraction layer (`IStorageAdapter`) for IndexedDB or Supabase |
| **Asset** | Reusable resource: Prompt Template, Custom Component, AI Model Setting, Document |
| **Global Context** | Auxiliary document content snapshotted into batch for prompt enrichment |

## UI

| Term | Description |
| --- | --- |
| **Designer** | Visual DAG editor using React Flow (@xyflow) to build orchestrations |
| **FlowCanvas** | React Flow canvas for drag-and-drop stage editing |
| **StageConfigPanel** | Right sidebar panel for configuring a selected stage |
| **Asset Library** | Page for managing documents, templates, components |
| **Launcher** | Page for batch execution — input mapping, JSON upload, run |
| **Monitor** | Page for tracking batch progress and task results |
| **Community Hub** | Public marketplace for sharing orchestrations and assets |

## File References

| File | Purpose |
| --- | --- |
| `src/lib/types.ts` | Core TypeScript type definitions |
| `src/lib/storage/StorageAdapter.ts` | Storage abstraction interface |
| `src/services/stageService.ts` | Stage sync, template management |
| `src/services/batchService.ts` | Batch/launch creation |
| `src/workers/taskExecutor.worker.ts` | Task execution worker |
| `src/stores/designerStore.ts` | Designer canvas state (Zustand) |
| `src/components/designer/StageConfigPanel.tsx` | Stage configuration UI |
