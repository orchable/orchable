# PROMPT PLACEHOLDER TEMPLATE

> **Version:** 1.0 | **Last Updated:** 2026-02-20
> **Scope:** All prompt files in `src/n8n/prompts/`

This document defines the **canonical conventions** for writing prompt files in this system. All new and existing prompts MUST follow this template.

---

## 1. VARIABLE DELIMITER CONVENTION

**System variables** (injected by the orchestrator/n8n at runtime) use **`%%variable_name%%`** syntax:

```
%%variable_name%%
```

### Standard System Variables

| Variable | Stage | Description |
|:---------|:------|:------------|
| `%%input_data%%` | All | Primary input payload (JSON or TSV from previous stage) |
| `%%batch_number%%` | Stage 1 | Batch sequence number |
| `%%lo_count%%` | Stage 1 | Total number of Learning Objectives in batch |
| `%%target_question_count%%` | Stage 1 | Number of questions to generate |
| `%%assessment_item_format%%` | Stage 2 | Override question type format |

### ⚠️ DRAG_AND_DROP Exception

DRAG_AND_DROP question blanks use **`{{placeholder_name}}`** (double braces) — this is **NOT** a system variable, it is part of the question content itself:

```
✅ System variable:   %%input_data%%
✅ D&D placeholder:   Cây lấy {{chat_1}} từ không khí
❌ NEVER mix:         %%chat_1%%   ← Wrong for D&D blanks
```

---

## 2. FILE HEADER CONVENTION

Every prompt file MUST begin with this header block:

```markdown
# SYSTEM INSTRUCTION: [STAGE N] - [STAGE NAME IN CAPS] ([MODE])

> **Mode:** BATCH - [Brief description of mode]
> **Reference Data:** See `iostem-reference-schema.json` for all valid enum codes and coefficients.
> **Output Compatibility:** [Output format description]
```

---

## 3. MISSION BLOCK CONVENTION

Immediately after the header, define the role and key constraints:

```markdown
## MISSION
You are the **[Role Title]**. In **BATCH MODE**, your goal is to [goal description].

**FOCUS:** [Key focus areas].
**LANGUAGE:** VIETNAMESE (Tiếng Việt).
**OUTPUT:** The output MUST be strictly valid JSON content without other comment or text.
```

---

## 4. INPUT DATA SECTION CONVENTION

The INPUT DATA section is the single injection point for runtime data.
All stages use `%%input_data%%` as the primary data variable.

```markdown
---
## INPUT DATA

%%input_data%%

---
```

Stage 1 may include additional metadata variables before `%%input_data%%`:

```markdown
---
## INPUT DATA
**Batch #%%batch_number%%** | **Total LOs:** %%lo_count%% | **Questions to Generate:** %%target_question_count%%
### Learning Objectives with Pre-Assigned Attributes:
%%input_data%%

**⚠️ CRITICAL:** [Stage-specific instruction about input data]

---
```

---

## 5. OUTPUT FORMAT SECTION CONVENTION

All stages MUST output a single JSON object with `output_data` as the root array.

```markdown
---

## OUTPUT FORMAT (JSON Array)

Returns a single JSON object containing an array of `output_data` that includes elements conforming to the following schema.

**JSON Schema:**

\`\`\`json
{
  "output_data": [
    {
      "[field_1]": "[value or description]",
      "[field_2]": "[value or description]",
      "..." : "..."
    }
  ]
}
\`\`\`

**CRITICAL:**
- [Key constraint 1]
- [Key constraint 2]
- Total elements in `output_data` = Total input items processed
```

### Stage-Specific output_data Schemas

#### Stage 1 — Core Question Generator
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
      "scenario": "...",
      "core_question": "...",
      "ideal_response": "...",
      "explanation": "...",
      "misconceptions": "...",
      "image_description": "... or null"
    }
  ]
}
```

#### Stage 2 — Question Formatter (TSV)
```json
{
  "output_data": [
    {
      "question_type_code": "MULTIPLE_CHOICE",
      "prompt": "...",
      "learning_objective_codes": "LO_CODE",
      "bloom_code": "REMEMBER",
      "difficulty_code": "EASY",
      "points": 2,
      "explanation": "...",
      "options": "Option A|Option B|Option C|Option D",
      "correctAnswer": "Option B",
      "tolerance": ""
    }
  ]
}
```

#### Stage 3 — Question Qualifier/Corrector
```json
{
  "output_data": [
    {
      "question_type_code": "MULTIPLE_CHOICE",
      "prompt": "...",
      "learning_objective_codes": "LO_CODE",
      "bloom_code": "REMEMBER",
      "difficulty_code": "EASY",
      "points": 2,
      "explanation": "...",
      "options": "Option A|Option B|Option C|Option D",
      "correctAnswer": "Option B",
      "tolerance": ""
    }
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

## 6. VALIDATION CHECKLIST CONVENTION

Every prompt MUST end with an internal validation checklist before the output:

```markdown
## VALIDATION CHECKLIST [FOR BATCH MODE | Internal]

Before generating the final JSON output, verify:

### ✅ Per-[Item] Validation:
- [ ] [Check 1]
- [ ] [Check 2]

### ✅ Output Checks:
- [ ] **output_data coverage:** One element per input item?
- [ ] **Field names:** Match expected schema exactly?
- [ ] **Vietnamese:** All content fields in Vietnamese?
- [ ] **No placeholders:** No `"..."` values in final output?
```

---

## 7. FILE FOOTER CONVENTION

Every prompt file MUST end with:

```markdown
---

**END OF PROMPT**
```

---

## 8. SECTION ORDER (Canonical)

All prompt files MUST follow this section order:

```
1.  # File Header (title + meta blockquote)
2.  ## MISSION
3.  > [!CAUTION] alert (critical rules for the stage)
4.  > [!IMPORTANT] alert (mode context)
5.  ---
6.  ## INPUT DATA  ← %%input_data%% goes here
7.  ---
8.  ## [Stage-specific reference/rules sections]
9.  ---
10. ## INSTRUCTIONS FOR BATCH MODE  (numbered steps)
11. ---
12. ## VALIDATION CHECKLIST
13. ---
14. ## OUTPUT FORMAT (JSON Array)
15. ---
16. **END OF PROMPT**
```

---

## 9. QUICK REFERENCE

| Convention | Rule |
|:-----------|:-----|
| System variable syntax | `%%variable_name%%` |
| D&D blank syntax | `{{placeholder_name}}` |
| Primary input variable | `%%input_data%%` |
| Output root key | `output_data` (always array) |
| Options separator | Pipe `\|` within a string value |
| Content language | Vietnamese only |
| Output format | Strictly valid JSON, no extra text |
| File end marker | `**END OF PROMPT**` |
