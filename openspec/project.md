# Orchable Project

## About

Orchable is a **client-side SPA** (no SSR) that enables users to design, execute, and share
multi-stage AI orchestration pipelines. Users bring their own API keys (BYOK). The platform
uses a dual-tier storage model: free users use IndexedDB, premium users sync to Supabase.

**Stage**: Production | **Stack summary**: React 18 + TypeScript 5.8 + Vite 5.4 + Supabase + Dexie

---

## Architecture Rules

### Rule 1: Dual-Tier Storage (CRITICAL)

Every service that reads or writes data MUST check the user `tier` and route through
`StorageAdapter`:

- **Free Users**: IndexedDB for all data. Registered free users sync reusable assets
  (Prompt Templates, Custom Components, AI Model Settings) to Supabase. Documents are local only.
- **Premium Users**: All data (including Documents) synced to Supabase + File Storage.

```typescript
// ✅ Always use the adapter
const adapter = storage.adapter;
await adapter.createBatch(data);

// ❌ Never bypass the adapter
await supabase.from('task_batches').insert(data);
```

### Rule 2: Backward Compatibility

New fields on `StepConfig` (in `src/lib/types.ts`) MUST be optional. Never rename or remove
`stage_key` — it is the stable runtime identifier for task routing.

### Rule 3: Worker Isolation

`src/workers/taskExecutor.worker.ts` cannot import main-thread modules (no DOM, no React).
All AI task execution runs in this Worker. Changes to its core poll loop require thorough review.

---

## AI Agent Change Flow

Before implementing any non-trivial change:

```text
1. Read this file + .ai/ARCHITECTURE.md + .ai/GUARDRAILS.md
2. Run:  openspec list
         openspec list --specs
3. Create proposal: openspec/changes/{change-id}/proposal.md
4. Get approval, then implement tasks.md in order
5. Verify: npm run build + openspec validate --strict
6. Archive: openspec archive {change-id} --yes
7. Post-archive: check doc/ for stale content + run npm run sync:context
```

**Slash commands (Antigravity workflows)**:

- `/proposal` — scaffold a new OpenSpec change
- `/apply` — implement an approved proposal
- `/archive` — archive a deployed change (includes doc/ check)

---

## AI Context File Index

| File                      | Purpose                                              | When to Read |
| ---                       | ---                                                  | ---          |
| `.ai/ARCHITECTURE.md`     | System architecture, data flow, key modules          | Before touching any service or worker |
| `.ai/CONVENTIONS.md`      | File naming, component patterns, import aliases      | Before creating new files |
| `.ai/GUARDRAILS.md`       | Do/Don't rules, pre-flight checklist                 | Before committing any change |
| `.ai/STACK.md`            | Exact package versions and constraints               | Before adding dependencies |
| `.ai/GLOSSARY.md`         | Domain terminology (Stage, Batch, Task, Cardinality) | When unsure about a term |
| `REJECTED_DECISIONS.md`   | Architectural decisions that were tried and rejected | Before proposing architecture changes |
| `openspec/specs/`         | Capability specs (9 capabilities)                    | Before proposing changes to a capability |

---

## doc/ Update Policy

`doc/` contains technical documentation (schema, guides, workflows). It is **NOT** part of
OpenSpec specs, but must be kept in sync:

> **When archiving any OpenSpec change**, scan `doc/00_Index.md` and relevant doc files
> for content that may be stale due to the archived change. Update them before the next
> dev session, or flag them with a `<!-- STALE: reason -->` comment for human review.

---

## Platform Context Sync

All platform-specific AI rule files (`.cursor/`, `.windsurfrules`, `.agents/`, `.github/copilot-instructions.md`)
are **auto-generated** from this file and the `.ai/` directory.

To regenerate after editing any source:

```bash
npm run sync:context
```

Source files (do not edit the generated outputs directly):

- `openspec/project.md` ← this file
- `.ai/ARCHITECTURE.md`
- `.ai/CONVENTIONS.md`
- `.ai/GUARDRAILS.md`
- `.ai/STACK.md`
- `.ai/GLOSSARY.md`
- `REJECTED_DECISIONS.md`
