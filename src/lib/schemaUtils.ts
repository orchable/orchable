/**
 * Schema Utilities for Stage Input/Output Contract
 * 
 * Functions for extracting input fields from prompts,
 * generating output format sections, schema inference,
 * and migration from legacy OutputSchemaField format.
 */

import type { InputField, OutputSchemaField, StageContract, JsonSchemaProperty, GeminiJsonSchema } from './types';

/**
 * Extract variable names from a prompt template.
 * Finds all {{variable}} patterns (or custom delimiters) and returns unique variable names.
 */
export function extractInputFields(
    promptTemplate: string,
    delimiters: { start: string; end: string } = { start: '{{', end: '}}' }
): InputField[] {
    if (!delimiters.start || !delimiters.end) return [];
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const start = escapeRegExp(delimiters.start);
    const end = escapeRegExp(delimiters.end);
    
    const endChar = end.length > 0 ? end.charAt(0) : '';
    const regex = new RegExp(`${start}([^${escapeRegExp(endChar)} \n\t\r]+)${end}`, 'g');
    
    const matches = promptTemplate.matchAll(regex);
    const names = new Set<string>();
    
    for (const match of matches) {
        names.add(match[1].trim());
    }
    
    return Array.from(names).map(name => ({
        name,
        type: 'string' as const,
        required: true,
    }));
}

/**
 * Generate the OUTPUT FORMAT section to be injected into prompts.
 * Works with GeminiJsonSchema format.
 */
export function generateOutputFormatSection(contract: StageContract): string {
    if (!contract.output.schema || !hasSchemaContent(contract.output.schema)) {
        return '';
    }
    
    const example = generateJsonExampleFromSchema(contract.output.schema);
    const rootLabel = contract.output.schema.type === 'array' ? 'array' : 'object';
    
    return `
## OUTPUT FORMAT
You MUST respond with a valid JSON ${rootLabel} matching this structure:
\`\`\`json
${JSON.stringify(example, null, 2)}
\`\`\`
Do NOT include any text outside the JSON. Response must be valid JSON only.
`.trim();
}

/**
 * Inject or replace the OUTPUT FORMAT section within a prompt template.
 */
export function injectOutputFormatIntoPrompt(prompt: string, section: string, mode: 'append' | 'prepend' | 'none' = 'append'): string {
    if (mode === 'none' || !section) return prompt;

    const sectionRegex = /## OUTPUT FORMAT[\s\S]*?(?=\n## |\n---\n|$)/;
    
    if (sectionRegex.test(prompt)) {
        return prompt.replace(sectionRegex, section);
    }

    if (mode === 'prepend') {
        return section + '\n\n' + prompt.trim();
    }
    
    return prompt.trim() + '\n\n' + section;
}

/**
 * Check if a GeminiJsonSchema has actual content (not empty).
 */
function hasSchemaContent(schema: GeminiJsonSchema): boolean {
    if (schema.type === 'object') {
        return !!schema.properties && Object.keys(schema.properties).length > 0;
    }
    if (schema.type === 'array') {
        return !!schema.items;
    }
    return false;
}

/**
 * Generate a JSON example from a GeminiJsonSchema.
 */
function generateJsonExampleFromSchema(schema: GeminiJsonSchema): unknown {
    const buildValue = (prop: JsonSchemaProperty, name?: string): unknown => {
        switch (prop.type) {
            case 'string':
                if (prop.enum && prop.enum.length > 0) return prop.enum[0];
                return `<${name || 'string'}>`;
            case 'number':
            case 'integer':
                if (prop.enum && prop.enum.length > 0) return prop.enum[0];
                return 0;
            case 'boolean':
                return true;
            case 'array':
                if (prop.items) {
                    return [buildValue(prop.items, 'item')];
                }
                return [];
            case 'object':
                if (prop.properties) {
                    const obj: Record<string, unknown> = {};
                    for (const [key, val] of Object.entries(prop.properties)) {
                        obj[key] = buildValue(val, key);
                    }
                    return obj;
                }
                return {};
            default:
                return null;
        }
    };

    if (schema.type === 'array') {
        if (schema.items) {
            return [buildValue(schema.items, 'item')];
        }
        return [];
    }

    // Object root
    if (schema.properties) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(schema.properties)) {
            result[key] = buildValue(val, key);
        }
        return result;
    }

    return {};
}

/**
 * Create a default empty contract.
 */
export function createDefaultContract(): StageContract {
    return {
        input: {
            fields: [],
            auto_extracted: true,
            delimiters: { start: '{{', end: '}}' }
        },
        output: {
            schema: undefined,
            format_injection: 'none',
            validation: 'loose',
        },
    };
}

/**
 * Map a StageContract to the input_schema format stored in Supabase.
 */
export function mapContractToInputSchema(contract?: StageContract) {
    return {
        required_fields: contract?.input.fields.filter(f => f.required).map(f => f.name) || [],
        optional_fields: contract?.input.fields.filter(f => !f.required).map(f => f.name) || [],
        delimiters: contract?.input.delimiters || { start: '{{', end: '}}' }
    };
}

/**
 * Map a StageContract to the output_schema format stored in Supabase.
 * Returns the GeminiJsonSchema directly (already standard JSON Schema).
 */
export function mapContractToOutputSchema(contract?: StageContract): GeminiJsonSchema | null {
    return contract?.output.schema || null;
}

/**
 * Merge auto-extracted fields with manually defined fields.
 */
export function mergeInputFields(
    extracted: InputField[], 
    manual: InputField[]
): InputField[] {
    const manualMap = new Map(manual.map(f => [f.name, f]));
    
    return extracted.map(field => {
        const override = manualMap.get(field.name);
        if (override) {
            return { ...field, ...override };
        }
        return field;
    });
}

/**
 * Generate a compact summary of input fields for display.
 */
export function summarizeInputFields(fields: InputField[]): string {
    if (fields.length === 0) return 'none';
    if (fields.length <= 3) {
        return fields.map(f => f.name).join(', ');
    }
    return `${fields.slice(0, 2).map(f => f.name).join(', ')} +${fields.length - 2}`;
}

/**
 * Generate a compact summary of output schema for display.
 */
export function summarizeOutputSchema(contract: StageContract): string {
    const schema = contract.output.schema;
    if (!schema || !hasSchemaContent(schema)) {
        return 'not defined';
    }
    
    if (schema.type === 'array' && schema.items) {
        return `array<${schema.items.type}>`;
    }
    
    if (schema.type === 'object' && schema.properties) {
        const keys = Object.keys(schema.properties);
        if (keys.length <= 2) {
            return `{${keys.join(', ')}}`;
        }
        return `{${keys.slice(0, 2).join(', ')}, ...}`;
    }
    
    return schema.type;
}

/**
 * Infer a GeminiJsonSchema from a sample JSON string.
 */
export function inferSchemaFromJson(jsonString: string): GeminiJsonSchema {
    let parsed: any;
    try {
        parsed = JSON.parse(jsonString);
    } catch (e) {
        throw new Error('Invalid JSON string');
    }

    if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
            return { type: 'array', items: { type: 'string' } };
        }
        const itemSchema = inferPropertyFromValue(parsed[0]);
        return { type: 'array', items: itemSchema };
        
    } else if (typeof parsed === 'object' && parsed !== null) {
        return inferObjectSchema(parsed);
    }
    
    throw new Error('Input must be a JSON Object or Array');
}

/**
 * Infer a GeminiJsonSchema from a JS object.
 */
function inferObjectSchema(obj: Record<string, any>): GeminiJsonSchema {
    const properties: Record<string, JsonSchemaProperty> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
        properties[key] = inferPropertyFromValue(value);
        if (value !== null && value !== undefined) {
            required.push(key);
        }
    }
    
    return { type: 'object', properties, required };
}

/**
 * Infer a JsonSchemaProperty from a JS value.
 */
function inferPropertyFromValue(value: any): JsonSchemaProperty {
    if (value === null) {
        return { type: 'string', nullable: true };
    }

    if (Array.isArray(value)) {
        const firstItem = value.length > 0 ? value[0] : null;
        const itemsSchema = firstItem !== null
            ? inferPropertyFromValue(firstItem)
            : { type: 'string' as const };
        return { type: 'array', items: itemsSchema };
    }

    if (typeof value === 'object') {
        const properties: Record<string, JsonSchemaProperty> = {};
        const required: string[] = [];
        for (const [key, val] of Object.entries(value)) {
            properties[key] = inferPropertyFromValue(val);
            if (val !== null && val !== undefined) {
                required.push(key);
            }
        }
        return { type: 'object', properties, required };
    }

    if (typeof value === 'boolean') return { type: 'boolean' };
    if (typeof value === 'number') {
        return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
    }
    if (typeof value === 'string') return { type: 'string' };

    return { type: 'string' };
}

// ============================================================
// Migration: Legacy OutputSchemaField[] → GeminiJsonSchema
// ============================================================

/**
 * Migrate legacy OutputSchemaField[] + rootType to GeminiJsonSchema.
 * Used for backward compatibility when loading old contracts from DB.
 */
export function migrateToGeminiSchema(
    fields: OutputSchemaField[],
    rootType: 'object' | 'array' = 'object'
): GeminiJsonSchema {
    const convertField = (field: OutputSchemaField): JsonSchemaProperty => {
        const prop: JsonSchemaProperty = {
            type: field.type === 'number' ? 'number' : field.type as any,
            description: field.description,
        };

        if (field.type === 'array' && field.items) {
            prop.items = convertField(field.items);
        }

        if (field.type === 'object' && field.properties) {
            const properties: Record<string, JsonSchemaProperty> = {};
            const required: string[] = [];
            for (const child of field.properties) {
                properties[child.name] = convertField(child);
                if (child.required !== false) {
                    required.push(child.name);
                }
            }
            prop.properties = properties;
            if (required.length > 0) prop.required = required;
        }

        return prop;
    };

    if (rootType === 'array' && fields.length > 0) {
        // In legacy format, array root used properties of the first "virtual" object item
        const properties: Record<string, JsonSchemaProperty> = {};
        const required: string[] = [];
        for (const field of fields) {
            properties[field.name] = convertField(field);
            if (field.required !== false) required.push(field.name);
        }
        return {
            type: 'array',
            items: { type: 'object', properties, required },
        };
    }

    // Object root
    const properties: Record<string, JsonSchemaProperty> = {};
    const required: string[] = [];
    for (const field of fields) {
        properties[field.name] = convertField(field);
        if (field.required !== false) required.push(field.name);
    }
    return { type: 'object', properties, required };
}

/**
 * Detect if a schema is in legacy OutputSchemaField[] format and auto-migrate.
 * Returns GeminiJsonSchema in all cases.
 */
export function ensureGeminiSchema(schema: any, rootType?: 'object' | 'array'): GeminiJsonSchema | undefined {
    if (!schema) return undefined;

    // Already a GeminiJsonSchema (has `type` at root level)
    if (schema.type && (schema.type === 'object' || schema.type === 'array')) {
        return schema as GeminiJsonSchema;
    }

    // Legacy format: OutputSchemaField[] (is an array of {name, type, ...})
    if (Array.isArray(schema) && schema.length > 0 && 'name' in schema[0]) {
        return migrateToGeminiSchema(schema as OutputSchemaField[], rootType || 'object');
    }

    // Empty array
    if (Array.isArray(schema) && schema.length === 0) {
        return undefined;
    }

    return undefined;
}
