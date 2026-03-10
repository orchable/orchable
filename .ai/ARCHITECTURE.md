# Orchable Architecture

## Project Structure

```
orchable/
├── src/
│   ├── components/        # UI components
│   │   ├── assets/        # Document asset management
│   │   ├── batch/         # Batch execution tracking
│   │   ├── common/        # Shared components (IconPicker, etc.)
│   │   ├── designer/      # Orchestrator Designer (FlowCanvas, StageConfigPanel, etc.)
│   │   ├── hub/           # Community Hub (sharing)
│   │   ├── landing/       # Landing page sections
│   │   ├── launcher/      # Batch launcher / input mapping
│   │   ├── monitor/       # Real-time task monitoring
│   │   ├── settings/      # Key management, AI provider config
│   │   ├── ui/            # shadcn/ui primitives (49 components)
│   │   └── usage/         # API key usage analytics
│   ├── contexts/          # React contexts (Auth, Tier)
│   ├── hooks/             # Custom hooks (useConfigs, useTier, etc.)
│   ├── lib/               # Core libraries
│   │   ├── storage/       # Dual-tier storage (IndexedDB + Supabase adapters)
│   │   ├── constants/     # Default configs, models
│   │   ├── types.ts       # Core TypeScript types
│   │   └── schemaUtils.ts # JSON Schema utilities
│   ├── pages/             # Route pages
│   ├── services/          # Business logic services (15 files)
│   ├── stores/            # Zustand stores (designerStore)
│   ├── workers/           # Web Workers (taskExecutor.worker.ts)
│   ├── n8n/               # n8n workflow integration
│   └── supabase/          # Supabase schema, migrations, edge functions
├── openspec/              # Specification-driven development
│   ├── specs/             # Committed capability specs
│   └── changes/           # Active change proposals
└── .ai/                   # AI Agent context (this directory)
```

## Data Flow

```
User (Designer) → OrchestratorConfig (Steps/Edges)
    → syncStagesToPromptTemplates (stageService)
    → prompt_templates (IndexedDB/Supabase)

User (Launcher) → createLaunch (batchService)
    → task_batches + ai_tasks (initial tasks)
    → Web Worker (taskExecutor.worker.ts)
    → Poll loop: pick "plan" tasks → processTask
    → handleNextStages → spawn child tasks
    → Batch complete
```

## Dual-Tier Storage Architecture

- **Free Users**: IndexedDB for all data. Registered free users sync reusable assets (Prompt Templates, Custom Components, AI Model Settings) to Supabase, but Documents remain local.
- **Premium Users**: All data (including Documents) synced to Supabase.

Code path: `src/lib/storage/StorageAdapter.ts` → `IndexedDBAdapter` or `SupabaseAdapter`.

## Execution Architecture

1. **Design-time**: `OrchestratorDesigner` → `designerStore` (Zustand) → save as `OrchestratorConfig` + sync templates.
2. **Launch-time**: `batchService.createLaunch` → topological sort stages → create initial tasks in first stage.
3. **Runtime**: `taskExecutor.worker.ts` (Web Worker) → poll `ai_tasks` table → `processTask` → `callGemini` → `handleNextStages` → create next tasks.
4. **Cardinality**: `1:1` (pass-through), `1:N` (split array into tasks), `N:1` (aggregate sibling tasks).
5. **Parallel Join**: DAG-based dependency check via `checkDependenciesMet`.

## Key Design Decisions

- **No SSR**: Client-side SPA only.
- **Web Worker execution**: AI tasks run in a dedicated Worker thread, polling IndexedDB.
- **BYOK**: Users bring their own API keys; `KeyManager` handles rotation, health, rate limiting.
- **Multi-vendor AI**: Gemini, DeepSeek, Qwen, MiniMax — all via OpenAI-compatible or Gemini API.
