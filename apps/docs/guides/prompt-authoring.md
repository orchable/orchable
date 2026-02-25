# 🤖 AI Agent Authoring Guide: Prompt Templates & Orchestration Configs

> **Audience:** AI Agents (Gemini, GPT, Claude, etc.) requested to create or extend Prompt Templates and Orchestration Configs for the Orchable system.
> **Last Updated:** 2026-02-24

This document provides full structures, rules, and practical examples so that an AI Agent can:
1. **Write new Prompt Templates** following system standards
2. **Create complete Orchestration Configs** (JSON) for any pipeline

---

## PART 1: PROMPT TEMPLATE

### 1.1 Concept

Each **Stage** in an Orchestrator corresponds to **1 Prompt Template** stored in the `prompt_templates` table (Supabase). A prompt template is a text instruction sent to Gemini AI, containing **placeholder variables** injected by the system at runtime.

---

### 1.2 Variable Conventions (Variable Delimiters)

| Type | Syntax | Purpose |
|:-----|:--------|:---------|
| **System variable** | `%%variable_name%%` | Data injected by n8n/orchestrator |
| **Content placeholder** (DRAG_AND_DROP) | `{{placeholder_name}}` | Blanks in questions — NOT system variables |

**Correct Example:**
```
%%input_data%%          ← System variable (system injects JSON from previous stage)
%%batch_number%%        ← System variable
Plants take {{chat_1}} from the air  ← Content placeholder in a D&D question
```

**Common System Variables:**

| Variable | Phase | Description |
|:---------|:----------|:------|
| `%%input_data%%` | All stages | JSON payload from previous stage or Launcher |
| `%%batch_number%%` | Stage 1 | Batch sequence number |
| `%%lo_count%%` | Stage 1 | Number of Learning Objectives in batch |
| `%%target_question_count%%` | Stage 1 | Number of questions to generate |
| `%%assessment_item_format%%` | Stage 2 | Question type override |

---

### 1.3 Prompt Structure (Canonical Section Order)

Every prompt file MUST follow this section order:

```
1.  # [File Header]             ← Title + meta blockquote
2.  ## MISSION                  ← AI role + goals
3.  > [!CAUTION] ...            ← Strict limitations (Caution alert)
4.  > [!IMPORTANT] ...          ← Important context (Info alert)
5.  ---
6.  ## INPUT DATA               ← %%input_data%% placed here
7.  ---
8.  ## [Stage-specific rules/references]
9.  ---
10. ## INSTRUCTIONS FOR BATCH MODE  ← Step-by-step instructions (numbered)
11. ---
12. ## VALIDATION CHECKLIST     ← Internal checklist before output
13. ---
14. ## OUTPUT FORMAT (JSON Array)  ← Output JSON schema
15. ---
16. **END OF PROMPT**
```

---

### 1.4 File Header

```markdown
# SYSTEM INSTRUCTION: STAGE [N] - [STAGE NAME IN CAPS] ([MODE])

> **Mode:** BATCH - [Short description of mode]
> **Reference Data:** See `iostem-reference-schema.json` for all valid enum codes.
> **Output Compatibility:** [Output format description, e.g., JSON Array / TSV]
```

---

### 1.5 Mission Block

```markdown
## MISSION
You are the **[AI Role]**. In **BATCH MODE**, your goal is to [goals].

[Additional description if needed]

**FOCUS:** [Key focus areas].
**LANGUAGE:** ENGLISH.
**OUTPUT:** The output MUST be strictly valid JSON content without other comment or text.
```

---

### 1.6 Input Data Section

**Stage 1 (with additional metadata):**
```markdown
---
## INPUT DATA
**Batch #%%batch_number%%** | **Total LOs:** %%lo_count%% | **Questions to Generate:** %%target_question_count%%
### Learning Objectives with Pre-Assigned Attributes:
%%input_data%%

**⚠️ CRITICAL:** [Input data specific instructions]

---
```

**Stage 2, 3+ (input_data only):**
```markdown
---
## INPUT DATA

%%input_data%%

---
```

> **Note:** `%%input_data%%` in Stage 2+ contains the `output_data[]` JSON from the previous stage. This structure must be clearly documented for the AI.

---

### 1.7 Output Format Section

Output MUST always be a JSON object with `output_data` as the root array:

```markdown
---

## OUTPUT FORMAT (JSON Array)

Returns a single JSON object containing an array of `output_data` that includes elements conforming to the following schema.

**JSON Schema:**

```json
{
  "output_data": [
    {
      "field_1": "value or description",
      "field_2": "value or description"
    }
  ]
}
```

**CRITICAL:**
- [Important constraint 1]
- [Important constraint 2]
- Total elements in `output_data` = Total input items processed

---

**END OF PROMPT**
```

---

### 1.8 Validation Checklist Section

```markdown
---

## VALIDATION CHECKLIST [FOR BATCH MODE | Internal]

Before generating the final JSON output, verify:

### ✅ Per-[Item] Validation:
- [ ] [Check 1 for each item]
- [ ] [Check 2]

### ✅ Output Checks:
- [ ] **output_data coverage:** One element per input item?
- [ ] **Field names:** Match expected schema exactly?
- [ ] **English:** All content fields in English?
- [ ] **No placeholders:** No `"..."` values in final output?

---
```

---

### 1.9 Practical Example: 3-Stage Pipeline

Here is a summary of a real 3-stage pipeline from `three-stage-workflow-question-gen`:

#### Stage 1 — Core Content Generator
- **AI Role:** Lead Curriculum Designer
- **Input:** TSV/JSON list of Learning Objectives with pre-assigned attributes
- **Input Variables:** `%%input_data%%`, `%%batch_number%%`, `%%lo_count%%`, `%%target_question_count%%`
- **Output JSON schema:**
```json
{
  "output_data": [
    {
      "id": 1,
      "lo_code": "SIO_MATH_G5_01",
      "bloom_level": "UNDERSTAND",
      "context_code": "REAL_PROB",
      "difficulty": "MEDIUM",
      "target_question_type": "MULTIPLE_CHOICE",
      "original_question_type": "MATCHING",
      "scenario": "Scenario description...",
      "core_question": "Open question...",
      "ideal_response": "Sample response...",
      "explanation": "3-part explanation...",
      "misconceptions": "List of misconceptions...",
      "image_description": "Description or null"
    }
  ]
}
```

#### Stage 2 — Question Formatter
- **AI Role:** Assessment Technology Specialist
- **Input:** `output_data[]` from Stage 1 (Core Questions)
- **Input Variables:** `%%input_data%%`, `%%assessment_item_format%%`
- **Output JSON schema:**
```json
{
  "output_data": [
    {
      "question_type_code": "MULTIPLE_CHOICE",
      "prompt": "English question text",
      "learning_objective_codes": "SIO_MATH_G5_01",
      "bloom_code": "UNDERSTAND",
      "difficulty_code": "MEDIUM",
      "points": 3,
      "explanation": "Brief plain text explanation",
      "options": "Option A|Option B|Option C|Option D",
      "correctAnswer": "Option B",
      "tolerance": ""
    }
  ]
}
```

#### Stage 3 — Question Qualifier
- **AI Role:** Chief Assessment Quality Officer
- **Input:** `output_data[]` from Stage 2 (Formatted Questions)
- **Input Variables:** `%%input_data%%`
- **Output JSON schema (extended with audit):**
```json
{
  "output_data": [
    { "...corrected questions only (PASS rows omitted)..." }
  ],
  "batch_summary": {
    "total_questions": 10,
    "passed": 7,
    "corrected": 2,
    "corrected_major": 1,
    "corrected_critical": 0,
    "human_review_required": false
  },
  "validation_results": [
    {
      "row": 1,
      "lo_code": "SIO_MATH_G5_01",
      "question_type": "MULTIPLE_CHOICE",
      "status": "PASS | CORRECTED | CORRECTED_MAJOR | CORRECTED_CRITICAL",
      "issues": []
    }
  ]
}
```

---

## PART 2: ORCHESTRATION CONFIG (JSON)

### 2.1 Concept

An **Orchestration Config** is a JSON file (or DB record) defining the entire pipeline: how many stages, order, how data is passed, AI settings, and IO contracts.

This file can be **exported from the Designer** or **manually created** and imported into the Launcher for batch runs.

---

### 2.2 Full JSON Structure

```json
{
  "_version": 1,
  "_exportedAt": "ISO 8601 timestamp",
  "orchestratorName": "Pipeline name",
  "orchestratorDescription": "Pipeline description",

  "config": {
    "id": "Orchestrator UUID",
    "name": "Pipeline name",
    "description": "Pipeline description",
    "steps": [ /* See details below */ ],
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601",
    "created_by": null,
    "viewport": { "x": 0, "y": 0, "zoom": 1 },
    "n8n_workflow_id": null,
    "input_mapping": {
      "mode": "tsv | json | manual",
      "fileName": null,
      "fieldMapping": {},
      "fieldSelection": { "shared": [], "perTask": [] },
      "selectedTaskIndices": []
    }
  },

  "nodes": [ /* ReactFlow UI state — auto-generated or ignored when manually created */ ]
}
```

---

### 2.3 Step Structure

Each step in `config.steps[]` has the structure:

```json
{
  "id": "step_[timestamp]",
  "name": "A",
  "label": "Display Name",
  "stage_key": "snake_case_key",
  "task_type": "routing_key_for_n8n",
  "prompt_template_id": "[orchestratorId]_[stage_key]_[stepId]",

  "cardinality": "1:1 | 1:N | N:1",
  "split_path": "result.questions",
  "split_mode": "per_item | per_batch",
  "output_mapping": "result.output_data",
  "return_along_with": [],

  "ai_settings": {
    "model_id": "gemini-flash-latest | gemini-pro-latest",
    "generate_content_api": "generateContent | streamGenerateContent",
    "generationConfig": {
      "temperature": 1,
      "topP": 0.95,
      "topK": 40,
      "maxOutputTokens": 32000
    }
  },

  "timeout": 300000,
  "retryConfig": {
    "maxRetries": 3,
    "retryDelay": 5000
  },

  "position": { "x": 171, "y": 162 },
  "dependsOn": [],

  "contract": {
    "input": { /* See 2.4 */ },
    "output": { /* See 2.5 */ }
  },

  "requires_approval": false
}
```

---

### 2.4 Contract: Input

```json
"input": {
  "fields": [
    {
      "name": "input_data",
      "type": "string",
      "required": true
    },
    {
      "name": "batch_number",
      "type": "string",
      "required": true
    }
  ],
  "delimiters": {
    "start": "%%",
    "end": "%%"
  },
  "auto_extracted": true
}
```

> **Note:** `fields` must **exactly** match the `%%variable%%` variables in the prompt. The `input_data` field MUST always be present.

---

### 2.5 Contract: Output (JSON Schema)

```json
"output": {
  "schema": {
    "type": "object",
    "properties": {
      "output_data": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "field_1": { "type": "string" },
            "field_2": { "type": "number" },
            "field_3": { "type": "string" }
          },
          "required": ["field_1", "field_2"]
        }
      },
      "batch_summary": {
        "type": "object",
        "properties": {
          "total": { "type": "number" }
        }
      }
    },
    "required": ["output_data"]
  },
  "validation": "loose | strict",
  "format_injection": "append | prepend | replace"
}
```

> **Note:** `format_injection: "append"` means the system will automatically append the OUTPUT FORMAT section to the end of the prompt when syncing.

---

### 2.6 Cardinality — Data Flow Rules

| Value | Meaning | When to Use |
|:--------|:--------|:-------------|
| `1:1` | 1 input task → 1 output task | Stage processes items independently |
| `1:N` | 1 input task → multiple sub-tasks (split) | Stage 1 receives 1 batch → creates multiple core questions |
| `N:1` | Multiple sub-tasks → merge into 1 | Stage merges results from multiple sub-tasks into a batch |

**3-stage pipeline example:**
```
Launcher (1 batch) → [Stage A: 1:1] → [Stage B: N:1 merge] → [Stage C: 1:1]
```

---

### 2.7 `split_path` and `output_mapping` Fields

| Field | Description | Example |
|:-------|:------|:------|
| `split_path` | JSONPath pointing to the array to split (for cardinality `1:N`) | `"result.questions"`, `"output_data"` |
| `output_mapping` | JSONPath pointing to the field containing data to pass to next stage | `"result.output_data"`, `"output_data"` |

> **Important:** `output_mapping` must match the key containing the primary array in that stage's output JSON.

---

### 2.8 `prompt_template_id` Convention

```
[orchestratorId]_[stage_key]_[stepId]
```

**Example:**
```
c13fc761-dcbd-47d5-8972-a417312b4d7c_core_question_step_1769876400823
```

---

### 2.9 `dependsOn` — Execution Order

```json
"dependsOn": ["step_1769876400823"]
```

- First stage: `"dependsOn": []`
- Next stage: `"dependsOn": ["previous stage ID"]`
- Parallel: both stages have the same `"dependsOn": ["common parent stage ID"]`

---

### 2.10 Complete Example: 3-Stage Pipeline

```json
{
  "_version": 1,
  "_exportedAt": "2026-02-24T00:00:00.000Z",
  "orchestratorName": "My Custom 3-Stage Pipeline",
  "orchestratorDescription": "Pipeline description",

  "config": {
    "id": "my-orch-uuid-here",
    "name": "My Custom 3-Stage Pipeline",
    "description": "Pipeline description",
    "steps": [
      {
        "id": "step_A",
        "name": "A",
        "label": "Stage 1: Core Generation",
        "stage_key": "core_gen",
        "task_type": "my_core_gen",
        "prompt_template_id": "my-orch-uuid-here_core_gen_step_A",
        "cardinality": "1:1",
        "split_path": "",
        "split_mode": "per_item",
        "output_mapping": "output_data",
        "return_along_with": [],
        "ai_settings": {
          "model_id": "gemini-flash-latest",
          "generate_content_api": "generateContent",
          "generationConfig": {
            "temperature": 1,
            "topP": 0.95,
            "topK": 40,
            "maxOutputTokens": 32000
          }
        },
        "timeout": 300000,
        "retryConfig": { "maxRetries": 3, "retryDelay": 5000 },
        "position": { "x": 171, "y": 162 },
        "dependsOn": [],
        "contract": {
          "input": {
            "fields": [
              { "name": "input_data", "type": "string", "required": true }
            ],
            "delimiters": { "start": "%%", "end": "%%" },
            "auto_extracted": true
          },
          "output": {
            "schema": {
              "type": "object",
              "properties": {
                "output_data": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": { "type": "number" },
                      "result_field": { "type": "string" }
                    },
                    "required": ["id", "result_field"]
                  }
                }
              },
              "required": ["output_data"]
            },
            "validation": "loose",
            "format_injection": "append"
          }
        },
        "requires_approval": false
      },
      {
        "id": "step_B",
        "name": "B",
        "label": "Stage 2: Formatter",
        "stage_key": "formatter",
        "task_type": "my_formatter",
        "prompt_template_id": "my-orch-uuid-here_formatter_step_B",
        "cardinality": "N:1",
        "split_path": "",
        "split_mode": "per_item",
        "output_mapping": "output_data",
        "return_along_with": [],
        "ai_settings": {
          "model_id": "gemini-flash-latest",
          "generate_content_api": "generateContent",
          "generationConfig": {
            "temperature": 1,
            "topP": 0.95,
            "topK": 40,
            "maxOutputTokens": 32000
          }
        },
        "timeout": 300000,
        "retryConfig": { "maxRetries": 3, "retryDelay": 5000 },
        "position": { "x": 171, "y": 400 },
        "dependsOn": ["step_A"],
        "contract": {
          "input": {
            "fields": [
              { "name": "input_data", "type": "string", "required": true }
            ],
            "delimiters": { "start": "%%", "end": "%%" },
            "auto_extracted": true
          },
          "output": {
            "schema": {
              "type": "object",
              "properties": {
                "output_data": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "formatted_field": { "type": "string" }
                    },
                    "required": ["formatted_field"]
                  }
                }
              },
              "required": ["output_data"]
            },
            "validation": "loose",
            "format_injection": "append"
          }
        },
        "requires_approval": false
      }
    ],
    "n8n_workflow_id": null,
    "input_mapping": {
      "mode": "tsv",
      "fileName": null,
      "fieldMapping": {},
      "fieldSelection": { "shared": [], "perTask": [] },
      "selectedTaskIndices": []
    }
  },

  "nodes": []
}
```

---

## PART 3: CHECKLIST FOR AI AGENTS

### When creating a new Prompt Template:

- [ ] File header has `# SYSTEM INSTRUCTION: STAGE N - [NAME]`?
- [ ] `## MISSION` defines clear role and goals?
- [ ] Includes `> [!CAUTION]` for strict constraints?
- [ ] `## INPUT DATA` contains `%%input_data%%`?
- [ ] Includes `## INSTRUCTIONS FOR BATCH MODE` with step-by-step instructions?
- [ ] Includes `## VALIDATION CHECKLIST` before OUTPUT FORMAT?
- [ ] `## OUTPUT FORMAT` contains full JSON schema with `output_data[]` as root array?
- [ ] File ends with `**END OF PROMPT**`?
- [ ] All variables in `%%variable%%` format (not `{{variable}}`)?
- [ ] Output content in English?

### When creating a new Orchestration Config:

- [ ] `_version: 1` and `_exportedAt` have values?
- [ ] `orchestratorName` and `orchestratorDescription` are filled?
- [ ] Each step has `id`, `name`, `label`, `stage_key`, `task_type`?
- [ ] `prompt_template_id` in `[orchId]_[stage_key]_[stepId]` format?
- [ ] `cardinality` is correct (`1:1`, `1:N`, or `N:1`)?
- [ ] `dependsOn` correctly links stage order?
- [ ] `contract.input.fields` matches `%%...%%` variables in prompt?
- [ ] `contract.output.schema` accurately reflects stage JSON output?
- [ ] `ai_settings.generationConfig` has `temperature`, `topP`, `topK`, `maxOutputTokens`?
- [ ] First stage has `dependsOn: []`?

---

## PART 4: QUICK REFERENCE

### Variable Conventions
```
%%input_data%%          → Primary input (always present)
%%batch_number%%        → Batch number metadata
%%lo_count%%            → Count of items in batch
%%assessment_item_format%% → Question type override
{{placeholder}}         → DRAG_AND_DROP content blank (not a system var!)
```

### Cardinality Quick Guide
```
1:1  → 1 batch item → 1 AI call → 1 result
1:N  → 1 batch item → splits into N sub-tasks (uses split_path)
N:1  → N sub-tasks → merge into 1 result (upstream N:1 cardinality)
```

### Model IDs
```
gemini-flash-latest    → Fast, cheap (default for most stages)
gemini-pro-latest      → Higher quality (for complex tasks)
```

### Recommended AI Settings
```json
{
  "temperature": 1,
  "topP": 0.95,
  "topK": 40,
  "maxOutputTokens": 32000
}
```

### Output schema Key Rules
```
- output_data   → ALWAYS an array, ALWAYS root key
- options       → Pipe-separated: "A|B|C|D"
- correctAnswer → Full text (not letter prefix)
- tolerance     → Only for NUMERIC, else ""
```

*Updated: 2026-02-24*
