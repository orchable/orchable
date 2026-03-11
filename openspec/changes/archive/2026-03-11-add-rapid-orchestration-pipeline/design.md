# Design: Rapid Orchestration Generation Pipeline

## Context

Orchable's `doc/sample-workflows/IDEAS.md` defines 15 orchestrations across 7 domains. Each orchestration requires:
1. An `orchestration.json` config (steps array with full metadata)
2. Prompt templates for each stage (stored in `prompt_templates` table)
3. Optionally, a custom component (stored in `custom_components` table)
4. SQL INSERT statements to populate the database

The existing manual process produced `PUBLISH_SAMPLES.sql` with 3 orchestrations — all of which crash the Designer due to structural bugs. A systematic pipeline is needed.

## Goals / Non-Goals

### Goals
- Define a **canonical JSON Schema** for orchestration configs that catches all structural errors at authoring time
- Provide a **validation CLI** (`validate.ts`) that verifies schema compliance, DAG integrity, and reference consistency
- Provide an **AI generation prompt** that any LLM can use to produce schema-compliant orchestration bundles from IDEAS.md definitions
- Fix the existing `loadConfig()` crash with a defensive guard
- Fix `PUBLISH_SAMPLES.sql` bugs

### Non-Goals
- This is NOT a user-facing feature — no UI changes (except the defensive `loadConfig()` fix)
- Not automating the actual SQL execution (that remains manual via Supabase SQL Editor)
- Not building a CI/CD pipeline for orchestrations (future enhancement)
- Not changing the `lab_orchestrator_configs` DB schema

## Architecture

```
doc/sample-workflows/IDEAS.md   (Human-written design specs)
        │
        ▼
scripts/orc-pipeline/
├── GENERATION_PROMPT.md         (Structured prompt for LLM)
├── schema/
│   └── orchestration.schema.json (JSON Schema — source of truth)
├── validate.ts                  (CLI: validate + generate SQL)
└── examples/
    └── orc-01-quiz-gen/         (Known-good reference)
        ├── orchestration.json
        └── prompts/
            ├── stage_a.md
            ├── stage_b.md
            └── stage_c.md
        │
        ▼
doc/sample-workflows/orc-XX-name/ (Generated output per ORC)
├── orchestration.json            (Schema-validated config)
├── prompts/
│   ├── stage_a.md
│   └── stage_b.md
└── components/
    └── viewer.tsx                (Optional custom component)
        │
        ▼  (validate.ts --sql)
PUBLISH_SAMPLES.sql               (Ready-to-run SQL)
```

## Decisions

### Decision 1: JSON Schema over TypeScript types for validation
**Chosen:** JSON Schema (draft-07)
**Reason:** JSON Schema can be used both by the validation script AND embedded directly in the AI generation prompt as a constraint. TypeScript types can't be consumed by LLMs as easily. The schema maps 1:1 to the `StepConfig` interface in `types.ts`.

### Decision 2: Single-file validation script (no build step)
**Chosen:** `tsx` runner (already in devDependencies) for `validate.ts`
**Reason:** The scripts directory should be zero-config. Using `tsx` (or `npx tsx`) means no compilation needed — just `npx tsx scripts/orc-pipeline/validate.ts <path>`.

### Decision 3: Prompt templates stored as separate markdown files
**Chosen:** One `.md` file per stage in `prompts/` directory
**Reason:** Keeps prompts version-controlled, diff-friendly, and separately editable. The validation script reads them and embeds them in the SQL output as `$P$...$P$` dollar-quoted strings.

### Decision 4: SQL generation as a validate.ts feature (not separate script)
**Chosen:** `validate.ts --sql` flag outputs SQL
**Reason:** Validation and SQL generation share the same parsing logic. Keeping them in one script avoids drift. The `--sql` flag outputs ready-to-paste SQL INSERT statements.

## JSON Schema — Key Constraints

The schema enforces the following rules that `PUBLISH_SAMPLES.sql` violated:

| Field | Rule | PUBLISH_SAMPLES Bug |
|-------|------|---------------------|
| `step.dependsOn` | **Required**, type `array` (can be `[]`) | Missing on root nodes |
| `step.ai_settings` | **Required**, must include `generationConfig` | Only had `model_id` |
| `step.ai_settings.generationConfig` | Must include `temperature` + `maxOutputTokens` | Completely absent |
| `step.cardinality` | Enum: `1:1`, `1:N`, `N:1` | OK (was correct) |
| `step.stage_key` | **Required**, regex `^[a-z][a-z0-9_]*$` | OK |
| `step.split_path` | Required when `cardinality = "1:N"` | OK |

## Validation Script — Checks

The `validate.ts` script performs these checks (ordered by severity):

### CRITICAL (blocks SQL generation)
1. **Schema compliance** — every field matches JSON Schema
2. **DAG integrity** — `dependsOn` graph has no cycles
3. **Orphan detection** — every step is reachable from a root (step with `dependsOn: []`)
4. **ID uniqueness** — no duplicate `step.id` or `step.stage_key`

### WARNING (reported but doesn't block)
5. **Prompt file existence** — checks that `prompts/{stage_key}.md` file exists
6. **Cardinality consistency** — `1:N` has `split_path`, `N:1` doesn't have `split_path`
7. **Component reference** — if `custom_component_id` is set, checks `components/` directory

### INFO
8. **Cost estimation** — counts stages using Pro/Thinking models and reports estimated per-run cost

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| AI-generated prompts may be low quality | The validation script checks structure, not semantic quality. Human review of prompts remains necessary. |
| JSON Schema may drift from TypeScript types | Schema is designed to be a subset of `StepConfig`. Add a comment in `types.ts` referencing the schema. |
| LLM may not follow schema perfectly | The GENERATION_PROMPT.md includes a complete known-good example + explicit schema constraints. Validation catches any drift. |

## Open Questions

1. **Should the validation script also check prompt template content?** (e.g., verify `%%input_data%%` placeholder exists). Recommend: Yes, as a WARNING-level check.
2. **Should we support batch validation?** (validate all ORC-* directories at once). Recommend: Yes, via glob pattern.
