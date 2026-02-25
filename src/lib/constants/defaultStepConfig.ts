export const DEFAULT_PROMPT_TEMPLATE = `# SYSTEM INSTRUCTION: [STAGE N] - [STAGE NAME IN CAPS] ([MODE])

> **Mode:** BATCH - [Brief description of mode]
> **Reference Data:** See \`iostem-reference-schema.json\` for all valid enum codes and coefficients.
> **Output Compatibility:** [Output format description]

## MISSION
You are the **[Role Title]**. In **BATCH MODE**, your goal is to [goal description].

**FOCUS:** [Key focus areas].
**LANGUAGE:** ENGLISH.
**OUTPUT:** The output MUST be strictly valid JSON content without other comment or text.

---

## INPUT DATA

%%input_data%%

---

## OUTPUT FORMAT (JSON Array)

Returns a single JSON object containing an array of \`output_data\` that includes elements conforming to the following schema.

**JSON Schema:**

\`\`\`json
{
  "output_data": [
    {
      "[field_1]": "[value or description]",
      "[field_2]": "[value or description]"
    }
  ]
}
\`\`\`

**CRITICAL:**
- Total elements in \`output_data\` = Total input items processed

---

## VALIDATION CHECKLIST [FOR BATCH MODE | Internal]

Before generating the final JSON output, verify:

### ✅ Per-[Item] Validation:
- [ ] [Check 1]
- [ ] [Check 2]

### ✅ Output Checks:
- [ ] **output_data coverage:** One element per input item?
- [ ] **Field names:** Match expected schema exactly?
- [ ] **English:** All content fields in English?
- [ ] **No placeholders:** No \`"..."\` values in final output?

---

**END OF PROMPT**`;

export const DEFAULT_STAGE_CONFIG = {
	stage_key: "core_question",
	task_type: "core_question_gen",
	cardinality: "1:1" as const,
	split_path: "result.questions",
	split_mode: "per_item" as const,
	output_mapping: "result",
	prompt_template_id: "",
	ai_settings: {
		model_id: "gemini-2.0-flash" as const,
		generationConfig: {
			temperature: 1,
			topP: 0.95,
			topK: 40,
			maxOutputTokens: 32000,
			generate_content_api: "generateContent" as const,
		},
	},
	timeout: 300000,
	retryConfig: {
		maxRetries: 3,
		retryDelay: 5000,
	},
	contract: {
		input: {
			fields: [
				{
					name: "batch_number",
					type: "string" as const,
					required: true,
				},
				{ name: "lo_count", type: "string" as const, required: true },
				{
					name: "target_question_count",
					type: "string" as const,
					required: true,
				},
				{ name: "lo_entries", type: "string" as const, required: true },
			],
			delimiters: { end: "%%", start: "%%" },
			auto_extracted: true,
		},
		output: {
			schema: [
				{
					name: "output_data",
					type: "array" as const,
					required: true,
					items: {
						name: "item",
						type: "object" as const,
						required: true,
						properties: [
							{
								name: "id",
								type: "number" as const,
								required: true,
							},
							{
								name: "lo_code",
								type: "string" as const,
								required: true,
							},
							{
								name: "bloom_level",
								type: "string" as const,
								required: true,
							},
							{
								name: "context_code",
								type: "string" as const,
								required: true,
							},
							{
								name: "difficulty",
								type: "string" as const,
								required: true,
							},
							{
								name: "target_question_type",
								type: "string" as const,
								required: true,
							},
							{
								name: "original_question_type",
								type: "string" as const,
								required: true,
							},
							{
								name: "scenario",
								type: "string" as const,
								required: true,
							},
							{
								name: "core_question",
								type: "string" as const,
								required: true,
							},
							{
								name: "ideal_response",
								type: "string" as const,
								required: true,
							},
							{
								name: "explanation",
								type: "string" as const,
								required: true,
							},
							{
								name: "misconceptions",
								type: "string" as const,
								required: true,
							},
							{
								name: "image_description",
								type: "string" as const,
								required: true,
							},
						],
					},
				},
			],
			rootType: "object" as const,
			validation: "loose" as const,
			format_injection: "append" as const,
		},
	},
};
