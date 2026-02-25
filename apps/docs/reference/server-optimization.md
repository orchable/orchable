---
sidebar_position: 4
title: Server Optimization
---

# ⚙️ Server Capacity & n8n Optimization

This document provides guidelines for estimating the capacity of the n8n server and best practices for optimizing its performance, particularly for AI-heavy workflows.

---

## 1. Capacity Estimation (4GB RAM / 2 CPU)

Assuming a default n8n setup:

- **Very Safe Threshold**: **10 - 20 tasks running concurrently**.
- **Risk Zone (Peak)**: **40 - 60 tasks** hanging concurrently.
- **Crash Zone (OOM)**: Attempting to process **>100 AI tasks** simultaneously.

> [!TIP]
> "Concurrent" refers to tasks actively waiting for an AI API response.

---

## 2. Optimization Strategies

### A. Execution Data Management
Disable saving data for successful runs to minimize database bloat and RAM usage.

```env
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_PRUNE_MAX_COUNT=1000
```

### B. Expand Node.js Memory Limits
Explicitly allow Node.js to use more than its default 1.5-2GB limit.

```env
# For 4GB RAM, allocate 3GB to Node.js
NODE_OPTIONS="--max-old-space-size=3072"
```

### C. Workflow Throttling
- **Limit Database Reads**: Fetch only 10-20 tasks at a time from Supabase.
- **Use Split In Batches**: Process large datasets in smaller chunks.
- **Tune Triggers**: Adjust schedule intervals to smooth out load.

---

## 3. Sustained Throughput
With **20 concurrent tasks** and a **15s average duration**:
- ~80 tasks/minute
- ~4,800 tasks/hour
- ~115,000 tasks/day (theoretical max)

*Last Updated: 2026-02-24*
