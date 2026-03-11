# Change: Add Rapid Orchestration Generation Pipeline

## Why
Orchable's Community Hub needs 15+ sample orchestrations (defined in `doc/sample-workflows/IDEAS.md`) to demonstrate the platform's capabilities across education, marketing, engineering, healthcare, legal, and creative domains. Currently:
1. **Manually crafting SQL** is error-prone — the existing `PUBLISH_SAMPLES.sql` has bugs (missing `dependsOn`, incomplete `ai_settings`) that crash the Designer.
2. **No validation layer** exists to catch structural errors before data reaches the DB.
3. **No repeatable workflow** exists for AI-assisted generation — each orchestration must be hand-assembled from scratch.

This change introduces a **developer tooling pipeline** that combines AI generation with automated validation to produce correct, stable orchestration configs at scale.

## What Changes
- **ADDED** JSON Schema definition (`scripts/orc-pipeline/schema/orchestration.schema.json`) as the single source of truth for a valid orchestration config structure.
- **ADDED** Validation script (`scripts/orc-pipeline/validate.ts`) that checks orchestration JSON files against the schema, validates DAG integrity, verifies prompt template references, and optionally generates SQL INSERT statements.
- **ADDED** AI Generation Prompt Template (`scripts/orc-pipeline/GENERATION_PROMPT.md`) — a structured prompt that takes an ORC definition from IDEAS.md and produces a complete, schema-compliant orchestration bundle (config + prompts + optional component code).
- **ADDED** Reference example (`scripts/orc-pipeline/examples/`) containing a known-good orchestration (derived from working Pipeline Quiz Gen) as a generation reference.
- **MODIFIED** `doc/sample-workflows/PUBLISH_SAMPLES.sql` — fixed existing bugs (missing `dependsOn`, incomplete `ai_settings`).
- **ADDED** Defensive guard in `designerStore.ts` `loadConfig()` — `(step.dependsOn || [])` to prevent crash on malformed data from DB.

## Impact
- Specs: `hub` (new requirement for config validation)
- Code:
  - `scripts/orc-pipeline/` (NEW — entire directory)
  - `src/stores/designerStore.ts` (defensive fix)
  - `doc/sample-workflows/PUBLISH_SAMPLES.sql` (bug fixes)

> [!IMPORTANT]
> This is primarily a **developer tooling** change, not a user-facing feature. The Hub spec delta adds a validation requirement to ensure published orchestrations are structurally valid.
