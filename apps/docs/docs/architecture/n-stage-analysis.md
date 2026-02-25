---
sidebar_position: 4
title: N-Stage Analysis
---

# 🏛️ Architecture Appendix: N-Stage Integration

This document (circa Jan 2026) outlines the original analysis and recommendations for moving Orchable from a linear sequencer to a hierarchical N-Stage orchestrator.

---

## 1. Original Gap Analysis

At the start of 2026, the system lacked several key features for complex orchestration:

- **Hierarchy Tracking**: No `root_task_id` or `hierarchy_path` to track lineage.
- **Stage Classification**: Generic step names instead of typed `stage_key` markers.
- **Visualization**: Timeline-only view without high-level pipeline cards.

---

## 2. Integrated Recommendations

### Data Model Evolution
The following fields were added to the core task model to support nesting:
- `root_task_id`: Points to the absolute origin of a task chain.
- `hierarchy_path`: A JSON array of ancestor IDs for fast tree traversal.
- `stage_key`: A unique identifier for the prompt template being used.

### The PipelineProgress Component
A new visualization layer was introduced above the task monitor to show current stage status (Pending/Running/Done) using a card-and-arrow metaphor.

---

## 3. Impact
These changes enabled **Fan-out** (1:N) and **Merge** (N:1) operations, allowing Orchable to handle complex content generation loops that were previously impossible.

*Historical Reference Date: 2026-01-31*
