## 1. Schema & Database Layer
- [x] 1.1 Create `document_assets` migration with RLS for text file metadata.
- [x] 1.2 Update `task_batches` table to include `global_context` support.
- [ ] 1.3 Add Supabase Edge Function cron job for Gemini Cache TTL cleanup.

## 2. Shared Libraries & Types
- [x] 2.1 Update `StageConfig`/`StepConfig` typing to include `export_config` within the IO interface.
- [x] 2.2 Create unified Document Parsing utility for TXT, CSV, MD, TSV files.

## 3. UI Implementation
- [x] 3.1 Implement 'Documents' tab UI in Asset Library (Grid/List, Upload Modal).
- [x] 3.2 Update `StageConfigPanel.tsx` -> IO Tab to include `Export Destinations` controls.
- [x] 3.3 Add Token/Size warning in Document Upload for Free tier limit enforcement.
- [x] 3.4 Update `Calculator.tsx` to handle Auxiliary Input metrics and Gemini Cache pricing estimation.

## 4. Execution Logic (Worker)
- [x] 4.1 Update `batchService.ts` to pre-fetch Document content from `document_assets` into `global_context` at launch (snapshotting).
- [x] 4.2 Introduce `triggerExport` logic inside `taskExecutor.worker.ts`'s `handleManyToOne` function (Last Sibling check).
- [ ] 4.3 Add prompt injection formatting logic for resolving `%%document.X%%` or `[GLOBAL_CONTEXT]` markers.
- [ ] 4.4 Build Gemini Cache creation middleware (for Premium Users only) inside `executionRouter.ts`.

## 5. Security & Validation
- [x] 5.1 Enforce Hard Limit token checking on Launcher for Free-tier campaigns using Auxiliary Documents.
- [ ] 5.2 Test edge case: Gemini TTL expiry mid-execution (Cache renewal recovery mechanism).
