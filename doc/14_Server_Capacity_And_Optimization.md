# Server Capacity and n8n Optimization Guide

This document provides guidelines for estimating the capacity of the n8n server and best practices for optimizing its performance, particularly when running AI-heavy workflows like the `Base Agent` with a standard configuration (e.g., 4GB RAM, 2 CPUs).

## 1. Workflow Characteristics (Base Agent)

*   **I/O Bound:** The agent workflow is primarily I/O bound. It spends most of its time waiting for network responses from Supabase (read/write operations) and external AI API providers (like Google Gemini).
*   **Bottlenecks:** The most significant bottleneck is the AI API call, which can take anywhere from **10 to 30 seconds** (or more) depending on the output length.
*   **Memory Footprint:** During this waiting period, n8n retains the entire execution context in memory (RAM). This includes the input data, constructed prompts, and variables.
*   **Resource Usage:**
    *   **CPU:** Generally low, except when parsing large JSON outputs or executing custom `Code` nodes.
    *   **RAM (Crucial):** Node.js manages JSON data inefficiently. Each concurrent execution waiting for an API response can consume between 10MB to 30MB of RAM. For a 4GB server (with ~1GB reserved for OS and n8n core), this leaves approximately ~3GB for active executions.

## 2. Capacity Estimation (4GB RAM, 2 CPU Server)

Assuming a default n8n setup without external queue workers (like Redis):

*   **Very Safe Threshold (Smooth UX):** **10 - 20 tasks running concurrently**. At this level, the system is highly stable, and the n8n UI remains responsive if you open it to monitor executions.
*   **Risk Zone (Peak/Stress):** **40 - 60 tasks hanging concurrently**.
*   **Crash Zone (OOM - Out of Memory):** Attempting to process **over 100 AI tasks hitting the API simultaneously**. In this scenario, the Node.js Garbage Collector will spike the CPU to 100%, followed by an Out of Memory error, causing the n8n container to crash and restart ("Connection Lost" or 502 Bad Gateway).

*Note: "Concurrent" means the exact number of executions actively holding open connections waiting for an AI response at any given second.*

### Sustained Throughput Example
If the system is throttled to safely handle **20 concurrent tasks at all times**:
*   Average task duration: 15 seconds.
*   Capacity per minute: (60s / 15s) * 20 = **80 tasks/minute**.
*   Capacity per hour: 80 * 60 = **4,800 tasks/hour**.
*   Capacity per day: ~115,000 tasks/day (Theoretical maximum, far exceeding standard free-tier API limits like Google's 15,000 tasks/day limit on Gemini 1.5 Flash).

## 3. Optimization Strategies to Maximize 4GB RAM

To ensure your 4GB/2Core server remains stable under load, you **must** configure the following environment variables for your n8n deployment (via Docker or PM2).

### A. Disable Saving Successful Execution Data (Critical)
By default, n8n saves every piece of data passed between nodes into the database. Storing large AI prompts and JSON outputs continuously will quickly bottleneck the database and consume RAM.
```env
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
EXECUTIONS_DATA_SAVE_ON_ERROR=all    # Only save failed executions for debugging
EXECUTIONS_DATA_SAVE_ON_PROGRESS=false
```

### B. Prune Execution Data
Prevent n8n from keeping too much historical data locally.
```env
EXECUTIONS_DATA_PRUNE_MAX_COUNT=1000 # Adjust lower if necessary
```

### C. Expand Node.js Memory Limits
Node.js default memory limits often cap around 1.5GB to 2GB, regardless of physical RAM. You must explicitly tell Node.js it has access to more memory.
```env
# Allow Node.js to use up to 3GB, leaving 1GB for the OS.
NODE_OPTIONS="--max-old-space-size=3072"  
```

### D. Throttle at the Source (n8n Workflow Design)
Implement "brakes" within the n8n workflows to prevent overloading the server:
*   **Limit Database Reads:** In the Supabase trigger or read nodes, always enforce a `Limit` (e.g., fetch only 10 or 20 tasks at a time, ordered by priority). Process the batch fully before fetching the next.
*   **Use Split In Batches:** If you must fetch a large number of records, use the `Split In Batches` node to process them in smaller chunks, ensuring the concurrent execution limit is never breached.
*   **Tune Schedule Triggers:** Adjust schedule intervals (e.g., retrieving 20 tasks every minute vs. 100 tasks every 5 minutes) to smooth out the load.
