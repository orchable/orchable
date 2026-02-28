# Change: Add Stage IO Features

## Why
The orchestrator currently only supports a single flat input list (Main Input) and lacks native mechanisms for injecting supporting documents (Auxiliary Inputs) and explicitly exporting stage results to external destinations. Adding these features will unlock complex workflows like document analysis (RAG) and automated reporting.

## What Changes
- **ADDED** `document_assets` table for Free/Premium users to manage supporting text files.
- **ADDED** `global_context` to `task_batches` table to store injected document content.
- **MODIFIED** Stage Configuration UI to include an **Export** option natively inside the IO tab.
- **MODIFIED** Task Execution Worker (`taskExecutor.worker.ts`) to trigger exports when a stage completes via the "Last Sibling Standing" logic.
- **ADDED** Cost calculation safeguards in `Launcher.tsx` to handle the token limits for Free users fetching Auxiliary Inputs.
- **ADDED** Gemini Context Caching mechanism for Premium users processing large documents.

## Impact
- Specs: `orchestration`, `assets`, `billing`
- Code: 
  - `src/lib/types.ts`
  - `src/supabase/schema.sql` (migrations)
  - `src/components/designer/StageConfigPanel.tsx`
  - `src/pages/Launcher.tsx`
  - `src/pages/Calculator.tsx`
  - `src/workers/taskExecutor.worker.ts`
