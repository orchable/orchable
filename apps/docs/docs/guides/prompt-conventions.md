---
sidebar_position: 10
title: Prompt Conventions
---

# 📝 Prompt Placeholder Conventions

This document defines the **canonical conventions** for writing prompt files in the Orchable system. Consistency across all templates is required for reliable orchestration.

---

## 1. Variable Delimiters

### System Variables
Variables injected by the orchestrator/n8n at runtime use **`%%variable_name%%`** syntax.

| Variable | Description |
|:---|:---|
| `%%input_data%%` | Primary input payload (JSON/TSV) |
| `%%batch_number%%` | Sequence number in high-volume batches |
| `%%target_question_count%%` | Total items to generate in this run |

### Content Placeholders
Internal templates (e.g., for Drag & Drop questions) use **`{{placeholder_name}}`**. These are **NOT** system variables and are NOT replaced by the orchestrator.

```text
✅ System variable:   %%input_data%%
✅ Content blank:      The plant takes {{chat_1}} from air.
```

---

## 2. Global Section Order
All prompt files must follow this canonical sequence to ensure model predictability:

1. **# Header**: Title and metadata blockquote.
2. **## MISSION**: Role definition and core constraints.
3. **## INPUT DATA**: The `%%input_data%%` injection point.
4. **## REFERENCE**: Domain-specific enums or knowledge.
5. **## INSTRUCTIONS**: Numbered execution steps.
6. **## VALIDATION**: Internal self-check list.
7. **## OUTPUT FORMAT**: Strictly valid JSON schema.
8. ****END OF PROMPT**** footer marker.

---

## 3. Output Format Standard
Every prompt must return a root JSON object with an `output_data` array.

```json
{
  "output_data": [
    {
      "id": 1,
      "result": "..."
    }
  ]
}
```

*Last Updated: 2026-02-25*
