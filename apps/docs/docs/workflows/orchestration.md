---
sidebar_position: 2
title: Orchestration
---

# 🎼 Workflow: Orchestration & Global Routing

The system does not use fixed n8n workflows for the entire process. Instead, it employs data-driven **Dynamic Orchestration**.

## Global Routing Table (GRT)

The **GRT** is the core concept. It is a map (JSON Object) that defines the entire structure of the process. The GRT is loaded into the task at the very first step (Root Task) and is transmitted intact to all descendant tasks.

### GRT Structure

```json
{
  "step_1_syllabus": {
    "template_id": "tpl_syllabus_gen",
    "next_ids": ["step_2_lesson_plan"]
  },
  "step_2_lesson_plan": {
    "template_id": "tpl_lesson_plan_gen",
    "cardinality": "one_to_many",
    "split_path": "result.lessons",
    "next_ids": ["step_3_slide", "step_3_quiz"]
  }
}
```

### Operational Mechanism

1.  **Hydration (In Phase 5)**:
    - When a task completes, Phase 5 examines its `current_stage_config`.
    - It retrieves the list of `next_ids`.
    - For each next ID, it lookups the `grt` to obtain the detailed configuration for that step.
    - It injects this configuration into the `current_stage_config` of the newly created child task.

2.  **Propagation**:
    - Child tasks receive the `grt` from their parent tasks.
    - This process repeats until `next_ids` is empty, marking the end of the chain.

## Forking Patterns

### 1. Linear
- **Config**: `cardinality: "one_to_one"`
- **Description**: Task A completes -> Task B is created.

### 2. Fan-out
- **Config**: `cardinality: "one_to_many"`
- **Description**: Task A returns an array. The system creates multiple sub-tasks running in parallel.
- **Split Path**: Defines the path to the array within the JSON (e.g., `result.modules`).

### 3. Parallel Branches
- **Config**: `next_ids: ["branch_A", "branch_B"]`
- **Description**: Task A completes -> Simultaneous creation of Task B1 and Task B2. These branches run independently.

## Advantages
- **Flexibility**: Modify a process by updating the JSON config (GRT) in the DB without editing n8n workflows.
- **Stateless**: Each task is self-contained.

*Last Updated: 2026-02-24*
