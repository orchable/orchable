---
sidebar_position: 2
title: Prompt Authoring
---

# 🤖 AI Agent Authoring Guide: Prompt Templates & Orchestration Configs

> **Audience:** AI Agents (Gemini, GPT, Claude, etc.) requested to create or extend Prompt Templates and Orchestration Configs for the Orchable system.

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

1.  **# [File Header]**             ← Title + meta blockquote
2.  **## MISSION**                  ← AI role + goals
3.  **> [!CAUTION] ...**            ← Strict limitations (Caution alert)
4.  **> [!IMPORTANT] ...**          ← Important context (Info alert)
5.  ---
6.  **## INPUT DATA**               ← `%%input_data%%` placed here
7.  ---
8.  **## [Stage-specific rules/references]**
9.  ---
10. **## INSTRUCTIONS FOR BATCH MODE**  ← Step-by-step instructions (numbered)
11. ---
12. **## VALIDATION CHECKLIST**     ← Internal checklist before output
13. ---
14. **## OUTPUT FORMAT (JSON Array)**  ← Output JSON schema
15. ---
16. **END OF PROMPT**

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

---

## PART 2: ORCHESTRATION CONFIG (JSON)

### 2.1 Concept

An **Orchestration Config** is a JSON file defining the entire pipeline: how many stages, order, how data is passed, AI settings, and IO contracts.

---

### 2.2 Step Structure

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
    "generationConfig": {
      "temperature": 1,
      "topP": 0.95,
      "topK": 40,
      "maxOutputTokens": 32000
    }
  }
}
```

---

## PART 3: CHECKLIST FOR AI AGENTS

### When creating a new Prompt Template:

- [ ] File header has `# SYSTEM INSTRUCTION: STAGE N - [NAME]`?
- [ ] `## MISSION` defines clear role and goals?
- [ ] `## INPUT DATA` contains `%%input_data%%`?
- [ ] `## OUTPUT FORMAT` contains full JSON schema with `output_data[]` as root array?
- [ ] All variables in `%%variable%%` format?

*Last Updated: 2026-02-24*
