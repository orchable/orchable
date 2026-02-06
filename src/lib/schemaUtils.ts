/**
 * Schema Utilities for Stage Input/Output Contract
 * 
 * Functions for extracting input fields from prompts,
 * generating output format sections, and schema validation.
 */

import type { InputField, OutputSchemaField, StageContract } from './types';

/**
 * Extract variable names from a prompt template.
 * Finds all {{variable}} patterns and returns unique variable names.
 */
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
    
    // Create regex dynamically based on delimiters
    // e.g., /\{\{([^}]+)\}\}/g for {{...}}
    // e.g., /\[\[([^\]]+)\]\]/g for [[...]]
    const start = escapeRegExp(delimiters.start);
    const end = escapeRegExp(delimiters.end);
    
    // Use a negated character class for the first character of the end delimiter 
    // to prevent matching across variables.
    const endChar = end.length > 0 ? end.charAt(0) : '';
    const regex = new RegExp(`${start}([^${escapeRegExp(endChar)} \n\t\r]+)${end}`, 'g');
    
    const matches = promptTemplate.matchAll(regex);
    const names = new Set<string>();
    
    for (const match of matches) {
        names.add(match[1].trim());
    }
    
    return Array.from(names).map(name => ({
        name,
        type: 'string' as const, // Default type; can be overridden manually
        required: true,          // Default to required; can be changed
    }));
}

/**
 * Generate the OUTPUT FORMAT section to be injected into prompts.
 * Creates a JSON example from the output schema definition.
 */
export function generateOutputFormatSection(contract: StageContract): string {
    if (!contract.output.schema || contract.output.schema.length === 0) {
        return '';
    }
    
    const example = generateJsonExample(contract.output.schema, contract.output.rootType || 'object');
    
    return `
## OUTPUT FORMAT
You MUST respond with a valid JSON ${contract.output.rootType === 'array' ? 'array' : 'object'} matching this structure:
\`\`\`json
${JSON.stringify(example, null, 2)}
\`\`\`
Do NOT include any text outside the JSON. Response must be valid JSON only.
`.trim();
}

/**
 * Generate a JSON example from OutputSchemaField definitions.
 */
function generateJsonExample(
    fields: OutputSchemaField[], 
    rootType: 'object' | 'array' = 'object'
): unknown {
    const buildFieldValue = (field: OutputSchemaField): unknown => {
        switch (field.type) {
            case 'string':
                return `<${field.name}: string>`;
            case 'number':
                return 0;
            case 'boolean':
                return true;
            case 'array':
                if (field.items) {
                    return [buildFieldValue(field.items)];
                }
                return [];
            case 'object':
                if (field.properties) {
                    const obj: Record<string, unknown> = {};
                    for (const prop of field.properties) {
                        obj[prop.name] = buildFieldValue(prop);
                    }
                    return obj;
                }
                return {};
            default:
                return null;
        }
    };
    
    // Build object from fields
    const result: Record<string, unknown> = {};
    for (const field of fields) {
        result[field.name] = buildFieldValue(field);
    }
    
    if (rootType === 'array') {
        return [result];
    }

    return result;
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
            schema: [],
            rootType: 'object',
            format_injection: 'append',
            validation: 'loose',
        },
    };
}

/**
 * Merge auto-extracted fields with manually defined fields.
 * Preserves manual type/required overrides while adding new extracted fields.
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
 * e.g., "batch_number, lo_entries, target_count"
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
 * e.g., "questions[]", "result: object"
 */
export function summarizeOutputSchema(contract: StageContract): string {
    if (!contract.output.schema || contract.output.schema.length === 0) {
        return 'not defined';
    }
    
    const { schema, rootType } = contract.output;
    
    if (rootType === 'array' && schema.length === 1) {
        return `${schema[0].name}[]`;
    }
    
    if (schema.length === 1) {
        return `${schema[0].name}: ${schema[0].type}`;
    }
    
    return `{${schema.map(f => f.name).slice(0, 2).join(', ')}${schema.length > 2 ? ', ...' : ''}}`;
}

/**
 * Infer Output Schema from a JSON input string.
 */
export function inferSchemaFromJson(jsonString: string): { schema: OutputSchemaField[]; rootType: 'object' | 'array' } {
    let parsed: any;
    try {
        parsed = JSON.parse(jsonString);
    } catch (e) {
        throw new Error('Invalid JSON string');
    }

    if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
            return { schema: [], rootType: 'array' };
        }
        // Infer from first item
        const itemSchema = extractSchemaFromValue(parsed[0], 'item');
        
        // If item is object, use its properties as root schema
        if (itemSchema.type === 'object' && itemSchema.properties) {
            return { schema: itemSchema.properties, rootType: 'array' };
        }
        
        // If item is primitive (or array), use it as single field
        return { schema: [itemSchema], rootType: 'array' };
        
    } else if (typeof parsed === 'object' && parsed !== null) {
        const rootField = extractSchemaFromValue(parsed, 'root');
        return { 
            schema: rootField.properties || [], 
            rootType: 'object' 
        };
    }
    
    throw new Error('Input must be a JSON Object or Array');
}

function extractSchemaFromValue(value: any, name: string): OutputSchemaField {
    const type = typeof value;
    
    if (value === null) {
        return { name, type: 'string', required: false };
    }

    if (Array.isArray(value)) {
        const firstItem = value.length > 0 ? value[0] : null;
        let itemsSchema: OutputSchemaField | undefined;
        
        if (firstItem !== null) {
            itemsSchema = extractSchemaFromValue(firstItem, 'item');
        } else {
             itemsSchema = { name: 'item', type: 'string' }; // fallback default
        }

        return {
            name,
            type: 'array',
            required: true,
            items: itemsSchema
        };
    }

    if (type === 'object') {
        const properties: OutputSchemaField[] = Object.entries(value).map(([key, val]) => 
            extractSchemaFromValue(val, key)
        );
        
        return {
            name,
            type: 'object',
            required: true,
            properties
        };
    }

    if (type === 'string' || type === 'number' || type === 'boolean') {
        return { name, type: type as any, required: true };
    }

    return { name, type: 'string', required: true };
}
