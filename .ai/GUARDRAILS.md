# Orchable AI Agent Guardrails

## ❌ Do NOT

1. **Modify `src/lib/types.ts`** without creating an OpenSpec proposal for type changes affecting multiple services
2. **Change IndexedDB schema** (`src/lib/storage/IndexedDBAdapter.ts`) without verifying backward compatibility — existing user data must not break
3. **Modify `taskExecutor.worker.ts`** core poll loop (`runLoop`, `processTask`) without thorough review — this is the execution engine
4. **Hardcode API keys** anywhere — all keys go through `KeyManager` or `keyPoolService`
5. **Import main-thread modules** in `workers/` — Workers cannot access DOM or React
6. **Remove or rename `stage_key`** values in saved configs — they are used as runtime identifiers for task routing
7. **Break Supabase RLS** — always include `created_by` / `user_id` in queries
8. **Bypass StorageAdapter** — never query IndexedDB or Supabase directly from components; use services that go through `storage.adapter`
9. **Modify `prompt_templates` table directly** — always use `stageService.syncStagesToPromptTemplates` for orchestrator templates
10. **Add new npm dependencies** without considering bundle size impact on Web Worker

## ✅ Always

1. **Respect Dual-Tier storage** — check `tier` when choosing IndexedDB vs Supabase path
2. **Use `@/` import alias** instead of relative paths (`../../../`)
3. **Use OpenSpec workflow** for architectural changes: `proposal.md` → review → implement
4. **Run `openspec validate --strict`** after spec changes
5. **Run `npm run build`** before committing to catch TypeScript errors
6. **Preserve backward compatibility** — new `StepConfig` fields must be optional
7. **Use `stage_key`** (not `id` or `name`) as the stable identifier for stages in runtime
8. **Log with prefix** `[Worker]`, `[BatchService]`, etc. for debuggability
9. **Handle both cardinality formats** — accept `"1:N"` and `"one_to_many"` interchangeably
10. **Test with both tiers** — verify changes work for free (IndexedDB) and premium (Supabase) users

## ⚠️ Be Careful With

1. **`taskExecutor.worker.ts`** (2095 lines): Core execution engine — changes affect all AI task processing
2. **`StageConfigPanel.tsx`** (2042 lines): Complex form — changes affect all stage configuration UI
3. **`batchService.ts`**: Creates execution batches — incorrect task creation breaks the entire pipeline
4. **`stageService.ts`**: Syncs stages to templates — errors cause missing templates at runtime
5. **`designerStore.ts`**: Canvas state — changes affect the visual DAG editor
6. **`storageAdapter.ts`**: Storage abstraction — changes affect both IndexedDB and Supabase adapters

## 🔍 Pre-Flight Checklist

Before submitting any significant change:

- [ ] `npm run build` passes (TypeScript compilation)
- [ ] `openspec validate --strict` passes (if specs were modified)
- [ ] Tested with Free Tier (IndexedDB path)
- [ ] New `StepConfig` fields are optional (backward compat)
- [ ] Worker changes tested with actual task execution
- [ ] No circular imports introduced
