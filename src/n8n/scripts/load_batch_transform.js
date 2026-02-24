// === LOAD BATCH TRANSFORM v2.0 MASTER ===
// Syncs standalone script with [Base] Load Batch workflow node logic.
// Focus: Robust variable replacement, AI settings preservation, and format injection.

const task = $input.item.json;
const templates = $('Get all row(s) from prompt-template').all();

// --- 1. PREPARE DATA SOURCES ---
// Handles both raw object and stringified 'extra' field
let taskExtra = {};
try {
    taskExtra = typeof task.extra === 'string' ? JSON.parse(task.extra) : (task.extra || {});
} catch (e) { taskExtra = {}; }

const inputData = task.input_data || {};

// Unified dictionary for variable replacement
// Priority: input_data > extra > task root fields
const enrichmentData = {
    ...task,           // includes batch_id, sequence, etc.
    ...taskExtra,      // includes batch_number, etc.
    ...inputData       // includes Specific Content variables
};

// --- 2. IDENTIFY TEMPLATE & CONFIG ---
const templateId = task.prompt_template_id;
const templateItem = templates.find(t => t.json.id === templateId || t.json.prompt_id === templateId);
const cachedTemplate = templateItem ? templateItem.json : null;

// Determine Delimiters (Default to %%...%%)
let delimiters = { start: '%%', end: '%%' };
if (cachedTemplate) {
    const rawSchema = cachedTemplate.prompt_input_schema || cachedTemplate.input_schema;
    if (rawSchema) {
        try {
            const schema = typeof rawSchema === 'string' ? JSON.parse(rawSchema) : rawSchema;
            if (schema.delimiters) delimiters = schema.delimiters;
        } catch (e) { /* use default */ }
    }
}

// --- 3. PROCESS PROMPT (VARIABLE REPLACEMENT) ---
let rawPrompt = task.prompt;
if ((!rawPrompt || rawPrompt.trim() === '') && cachedTemplate) {
    rawPrompt = cachedTemplate.template || '';
}
if (!rawPrompt) rawPrompt = '';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = new RegExp(escapeRegex(delimiters.start) + '\\s*([\\w_]+)\\s*' + escapeRegex(delimiters.end), 'g');

let finalPrompt = rawPrompt.replace(regex, (match, key) => {
    if (enrichmentData.hasOwnProperty(key)) {
        const value = enrichmentData[key];
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    }
    return match;
});

// --- 4. OPTIONAL: OUTPUT FORMAT INJECTION ---
// (Keeping this advanced feature from the script but making it safe)
if (cachedTemplate && cachedTemplate.output_schema) {
    try {
        const outputContract = typeof cachedTemplate.output_schema === 'string'
            ? JSON.parse(cachedTemplate.output_schema)
            : cachedTemplate.output_schema;

        if (outputContract && outputContract.schema && outputContract.schema.length > 0 && outputContract.format_injection !== 'none') {
            // Helper function (defined below) to build format section
            const formatSection = generateOutputFormatSection(outputContract);
            if (formatSection) {
                finalPrompt = injectOutputFormat(finalPrompt, formatSection, outputContract.format_injection || 'append');
            }
        }
    } catch (e) { /* ignore schema errors */ }
}

// --- 5. PROCESS AI SETTINGS ---
// Priority: task.ai_settings (manual override) > cachedTemplate.default_ai_settings > Fallback
let aiSettingsRaw = task.ai_settings;

if (!aiSettingsRaw && cachedTemplate) {
    aiSettingsRaw = cachedTemplate.default_ai_settings || cachedTemplate.ai_settings;
}

let finalAiSettings = {};
const fallbackGenConfig = {
    temperature: 1.0,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    thinkingConfig: { includeThoughts: false, thinkingBudget: -1 }
};

try {
    const parsed = typeof aiSettingsRaw === 'string' ? JSON.parse(aiSettingsRaw) : (aiSettingsRaw || {});

    finalAiSettings = {
        model_id: parsed.model_id || 'gemini-1.5-flash',
        generate_content_api: parsed.generate_content_api || 'generateContent',
        generationConfig: {
            ...fallbackGenConfig,
            ...(parsed.generationConfig || {})
        },
        safetySettings: parsed.safetySettings || [],
        systemInstruction: parsed.systemInstruction || undefined,
        tools: parsed.tools || undefined
    };
} catch (e) {
    finalAiSettings = { model_id: 'gemini-1.5-flash', generationConfig: fallbackGenConfig };
}

// --- 6. PROCESS STAGE CONFIG ---
// We passthrough whatever the launcher/orchestrator sent, 
// but ensure current_stage_config is hydrated from template if missing.
let templateStageConfig = {};
if (cachedTemplate && cachedTemplate.stage_config) {
    try {
        templateStageConfig = typeof cachedTemplate.stage_config === 'string'
            ? JSON.parse(cachedTemplate.stage_config)
            : cachedTemplate.stage_config;
    } catch (e) { }
}

const mergedExtra = {
    ...taskExtra,
    ...(inputData.extra || {}),
    current_stage_config: taskExtra.current_stage_config || templateStageConfig
};

// --- 7. FINAL OUTPUT ---
return {
    json: {
        ...task,
        task_id: '', // n8n placeholder
        extra: JSON.stringify(mergedExtra),
        data: JSON.stringify(inputData),
        prompt: finalPrompt,
        ai_settings: JSON.stringify(finalAiSettings),
        status: 'plan',
        result: '',

        // Flattened metadata
        supabase_task_id: task.id,
        task_type: task.task_type,
        batch_id: task.batch_id || '',
        launch_id: task.launch_id || '',
        test_mode: !!task.test_mode,
        sequence: task.sequence || 1,
        requires_approval: task.requires_approval || templateStageConfig.requires_approval || false,

        // Hierarchy
        stage_key: task.stage_key || '',
        root_task_id: task.root_task_id || '',
        hierarchy_path: task.hierarchy_path || []
    }
};

// --- HELPERS ---

function generateOutputFormatSection(outputContract) {
    const example = generateJsonExample(outputContract.schema, outputContract.rootType || 'object');
    const rootLabel = outputContract.rootType === 'array' ? 'array' : 'object';
    return `\n## OUTPUT FORMAT\nYou MUST respond with a valid JSON ${rootLabel} matching this structure:\n\`\`\`json\n${JSON.stringify(example, null, 2)}\n\`\`\`\nDo NOT include any text outside the JSON. Response must be valid JSON only.`;
}

function generateJsonExample(fields, rootType) {
    const build = (f) => {
        if (f.type === 'string') return `<${f.name}>`;
        if (f.type === 'number') return 0;
        if (f.type === 'boolean') return true;
        if (f.type === 'array') return f.items ? [build(f.items)] : [];
        if (f.type === 'object' && f.properties) {
            const o = {}; f.properties.forEach(p => o[p.name] = build(p)); return o;
        }
        return null;
    };
    const res = {}; fields.forEach(f => res[f.name] = build(f));
    return rootType === 'array' ? [res] : res;
}

function injectOutputFormat(prompt, section, mode) {
    const sectionRegex = /## OUTPUT FORMAT[\s\S]*?(?=\n## |\n---\n|$)/;
    if (sectionRegex.test(prompt)) return prompt.replace(sectionRegex, section);
    if (mode === 'prepend') return section + '\n\n' + prompt;
    return prompt.trim() + '\n\n' + section;
}
