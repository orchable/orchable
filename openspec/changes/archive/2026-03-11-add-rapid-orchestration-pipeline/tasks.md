# Tasks: Add Rapid Orchestration Generation Pipeline

## 0. Defensive Fix (Bug Fix — Pre-requisite)
- [x] 0.1 Guard `step.dependsOn` in `designerStore.ts` `loadConfig()` with `(step.dependsOn || [])` to prevent crash on malformed DB data
- [x] 0.2 Verify fix by loading an existing config from Recent Configs

## 1. JSON Schema Definition
- [x] 1.1 Create `scripts/orc-pipeline/schema/orchestration.schema.json` defining the full `StepConfig[]` shape
- [x] 1.2 Include required fields: `id`, `name`, `label`, `stage_key`, `task_type`, `cardinality`, `dependsOn`, `ai_settings` (with `generationConfig`)
- [x] 1.3 Add conditional requirements: `split_path` required when `cardinality = "1:N"`
- [x] 1.4 Add `orchestration-bundle.schema.json` for the wrapper (`_version`, `orchestratorName`, `config.steps[]`)

## 2. Validation Script (`validate.ts`)
- [x] 2.1 Create `scripts/orc-pipeline/validate.ts` with CLI interface (`npx tsx scripts/orc-pipeline/validate.ts <path>`)
- [x] 2.2 Implement JSON Schema validation using `ajv` (already commonly available, or bundle inline)
- [x] 2.3 Implement DAG cycle detection (topological sort)
- [x] 2.4 Implement orphan node detection (all nodes reachable from root)
- [x] 2.5 Implement ID/stage_key uniqueness check
- [x] 2.6 Implement prompt file existence check (WARNING level)
- [x] 2.7 Implement `--sql` flag for SQL INSERT statement generation
- [x] 2.8 Implement `--all` flag for batch validation of all `orc-*` directories
- [x] 2.9 Add `%%input_data%%` placeholder check in prompt files (WARNING level)

## 3. AI Generation Prompt Template
- [x] 3.1 Create `scripts/orc-pipeline/GENERATION_PROMPT.md` with structured sections:
  - System instruction (role, constraints)
  - JSON Schema as embedded constraint
  - Known-good example (ORC-01 Quiz Gen)
  - Input template (paste from IDEAS.md)
  - Output format specification
- [x] 3.2 Include explicit instructions for prompt template content generation (MISSION → INPUT DATA → INSTRUCTIONS → VALIDATION → OUTPUT FORMAT)

## 4. Reference Example
- [x] 4.1 Create `scripts/orc-pipeline/examples/orc-01-quiz-gen/` with known-good `orchestration.json`
- [x] 4.2 Add prompt markdown files for each stage (`stage_a.md`, `stage_b.md`, `stage_c.md`)
- [x] 4.3 Validate the reference example passes `validate.ts`

## 5. Fix Existing Sample Workflows
- [x] 5.1 Fix `doc/sample-workflows/orc-02-lesson-plan/orchestration.json` — add missing `dependsOn: []` to step_A, complete `ai_settings`
- [x] 5.2 Fix `doc/sample-workflows/orc-05-social-media/orchestration.json` — same fixes
- [x] 5.3 Fix `doc/sample-workflows/orc-09-code-review/orchestration.json` — same fixes
- [x] 5.4 Fix `PUBLISH_SAMPLES.sql` — add `dependsOn` to all root steps, complete `ai_settings`, set `is_public = TRUE`
- [x] 5.5 Validate all fixed files pass `validate.ts`

## 6. Verification
- [x] 6.1 Run `validate.ts` on all 3 existing orc-* directories → expect PASS
- [x] 6.2 Run `validate.ts --sql` → inspect generated SQL output
- [x] 6.3 Load a fixed orchestration in the Designer UI → expect no crash, nodes render correctly
- [x] 6.4 Use `GENERATION_PROMPT.md` with an LLM to generate one new ORC (e.g., ORC-04 SEO Blog Writer) → validate → confirm workflow works end-to-end
