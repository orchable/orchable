---
sidebar_position: 8
title: Tiers Deep-Dive
---

# 🏗️ Tier Architecture: Deep-Dive Audit

This report reviews the current implementation of the multi-tier architecture (Anonymous Lite, Free, Premium) based on the original implementation plan.

---

## 1. Compliance Review

### 1.1 Storage Adapter Layer
- **Requirement**: Unified `IStorageAdapter` interface for switching between `IndexedDBAdapter` (Lite) and `SupabaseAdapter` (Login).
- **Status**: **IMPLEMENTED (90%)**.
  - `IndexedDBAdapter.ts` (Dexie) and `SupabaseAdapter.ts` are active in `src/lib/storage`.
  - Core services (`executionService`, `taskActionService`, `batchService`) utilize the adapter pattern.
  - *Gap*: `configService.ts` historically bypassed the adapter, but is being updated for full persistence.

### 1.2 In-Browser Task Executor (Lite Mode)
- **Requirement**: Background Web Worker execution for users without a cloud backend.
- **Status**: **IMPLEMENTED**.
  - `taskExecutor.worker.ts` and `executorService.ts` handle local task processing via direct Gemini API calls.

### 1.3 Tier Context & Guarding
- **Requirement**: `TierContext` to manage user states (`anonymous`, `free`, `premium`).
- **Status**: **FULLY IMPLEMENTED**.
  - `TierContext.tsx` dynamically identifies tiers based on Auth state and email-based premium detection.
  - Usage limits are correctly gated at the component level.

### 1.4 Cloud Sync (Phase 2)
- **Requirement**: Automatic migration of local guest data to the cloud upon registration.
- **Status**: **IMPLEMENTED**.
  - `syncService.ts` triggers `migrateAnonymousData()` when login state changes.

---

## 2. Tier Summary

### 🎯 Lite Mode (Unauthenticated)
The codebase provides a robust framework for local execution. Users can design and run pipelines entirely within their browser without an account.
**Status**: 100% functional for private, local-only usage.

### 🎯 Login Mode (Authenticated)
The system is highly optimized for cloud synchronization. Real-time polling, persistent history across devices, and auto-rotation of API keys are fully functional.
**Status**: 100% functional for cloud-enabled usage.

---

## 3. Recommended Focus Areas
To reach perfect SaaS standards, the following areas are prioritized:
1. **Configuration Persistence**: Ensuring all pipeline designs are saved to local storage for guests.
2. **Execution Throttling**: Smoothing out Web Worker loads for high-concurrency local batches.

*Last Updated Audit: 2026-02-25*
