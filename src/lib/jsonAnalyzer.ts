/**
 * Enhanced JSON analyzer for group tasks.
 * It identifies shared fields (from metadata) and per-task fields (inside a task array).
 * Preserves arrays and objects as field types without over-flattening.
 */

export interface AnalysisResult {
	taskArrayPath: string; // e.g. "tasks" or "items"
	sharedFields: FieldInfo[]; // Fields from root that are NOT the task array
	perTaskFields: FieldInfo[]; // Fields within each task object
	sampleTasks: Record<string, unknown>[];
}

export interface FieldInfo {
	path: string; // Dot-notated path, e.g., "metadata.preset_name" or "input_data.lo_entries"
	type: "string" | "number" | "boolean" | "array" | "object" | "null";
	isComplex: boolean; // True if array or object
	sampleValue?: unknown; // A sample value for preview
}

/**
 * Extracts fields from an object up to a specified depth.
 * @param obj The object to extract fields from.
 * @param maxDepth The maximum depth to traverse for nested objects.
 * @param currentPath The current path prefix.
 * @param depth The current depth level.
 * @returns An array of FieldInfo objects.
 */
function extractFieldsWithDepth(
	obj: unknown,
	maxDepth: number,
	currentPath: string = "",
	depth: number = 0,
): FieldInfo[] {
	const fields: FieldInfo[] = [];
	if (!obj || typeof obj !== "object") return fields;

	const record = obj as Record<string, unknown>;

	for (const key in record) {
		const newPath = currentPath ? `${currentPath}.${key}` : key;
		const value = record[key];
		const valueType = getFieldType(value);
		const isComplex = valueType === "array" || valueType === "object";

		// Add this field
		fields.push({
			path: newPath,
			type: valueType,
			isComplex,
			sampleValue: isComplex
				? valueType === "array"
					? `[${(value as unknown[]).length} items]`
					: "{...}"
				: value,
		});

		// Recurse only if it's a plain object (not array) and we haven't reached maxDepth
		if (valueType === "object" && depth < maxDepth) {
			const nestedFields = extractFieldsWithDepth(
				value,
				maxDepth,
				newPath,
				depth + 1,
			);
			fields.push(...nestedFields);
		}
	}
	return fields;
}

function getFieldType(value: unknown): FieldInfo["type"] {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	return typeof value as FieldInfo["type"];
}

export function analyzeJsonStructure(json: unknown): AnalysisResult {
	const result: AnalysisResult = {
		taskArrayPath: "",
		sharedFields: [],
		perTaskFields: [],
		sampleTasks: [],
	};

	if (!json || typeof json !== "object") return result;

	const record = json as Record<string, unknown>;

	// 1. Find the likely task array (the top-level key with the largest array of objects)
	let bestPath = "";
	let maxObjects = 0;

	for (const key in record) {
		const val = record[key];
		if (Array.isArray(val)) {
			const objectCount = val.filter(
				(item) =>
					item && typeof item === "object" && !Array.isArray(item),
			).length;
			if (objectCount > maxObjects) {
				maxObjects = objectCount;
				bestPath = key;
			}
		}
	}
	result.taskArrayPath = bestPath;

	// 2. Extract shared fields (everything at root that is NOT the task array)
	// Use depth 1 for shared fields to avoid over-flattening metadata
	for (const key in record) {
		if (key === bestPath) continue; // Skip the task array itself
		const value = record[key];
		const valueType = getFieldType(value);
		const isComplex = valueType === "array" || valueType === "object";

		result.sharedFields.push({
			path: key,
			type: valueType,
			isComplex,
			sampleValue: isComplex
				? valueType === "array"
					? `[${(value as unknown[]).length} items]`
					: "{...}"
				: value,
		});

		// Add 1 level of nested fields from metadata
		if (valueType === "object") {
			const nested = extractFieldsWithDepth(value, 0, key, 1); // depth 0 means just immediate children
			result.sharedFields.push(...nested);
		}
	}

	// 3. Extract per-task fields from the identified array
	if (
		bestPath &&
		Array.isArray(record[bestPath]) &&
		(record[bestPath] as unknown[]).length > 0
	) {
		const taskArray = record[bestPath] as Record<string, unknown>[];
		result.sampleTasks = taskArray;
		const firstTask = taskArray[0];

		// For per-task, use depth 1 so we get top-level keys and their immediate children
		result.perTaskFields = extractFieldsWithDepth(firstTask, 1, "", 0);
	}

	return result;
}

/**
 * Flattens an object to pick values by dot-notated paths
 */
export function getValueByPath(obj: unknown, path: string): unknown {
	if (!path) return obj;
	return path
		.split(".")
		.reduce(
			(acc, part) =>
				(acc as Record<string, unknown>) &&
				(acc as Record<string, unknown>)[part],
			obj,
		);
}
/**
 * Checks if a saved input mapping is compatible with a new JSON analysis.
 */
export function isStructureCompatible(
	savedMapping:
		| { fieldSelection?: { shared: string[]; perTask: string[] } }
		| null
		| undefined,
	newAnalysis: AnalysisResult,
): boolean {
	if (!savedMapping || !savedMapping.fieldSelection) return false;

	const fieldSelection = savedMapping.fieldSelection as {
		shared: string[];
		perTask: string[];
	};
	const { shared, perTask } = fieldSelection;

	// Check if all previously selected shared paths exist in the new analysis
	const sharedPaths = new Set(newAnalysis.sharedFields.map((f) => f.path));
	const allSharedMatch = shared.every((p: string) => sharedPaths.has(p));
	if (!allSharedMatch) return false;

	// Check if all previously selected per-task paths exist in the new analysis
	const perTaskPaths = new Set(newAnalysis.perTaskFields.map((f) => f.path));
	const allPerTaskMatch = perTask.every((p: string) => perTaskPaths.has(p));
	if (!allPerTaskMatch) return false;

	return true;
}

export interface ProcessedTask {
	input_data: Record<string, unknown>;
	extra: Record<string, unknown>;
}

/**
 * Utility to process a task by applying shared fields, per-task fields, and manual mappings.
 * It separates data into input_data (contract fields) and extra (everything else selected).
 */
export function processTaskData(
	task: unknown,
	rootJson: unknown,
	fieldSelection: { shared: string[]; perTask: string[] },
	fieldMapping: Record<string, string> = {},
	contractFields: string[] = [],
): ProcessedTask {
	const input_data: Record<string, unknown> = {};
	const extra: Record<string, unknown> = {};

	// Helper to add data to the right bucket
	const addToBucket = (key: string, value: unknown, sourcePath?: string) => {
		// PREVENT adding entire contract or metadata objects to extra to avoid massive duplication
		if (
			(key === "input_data" || key === "extra") &&
			typeof value === "object" &&
			value !== null
		) {
			console.debug(
				`Skipping nested object '${key}' from bucket to prevent duplication`,
			);
			return;
		}

		const isInputDataPath =
			sourcePath === "input_data" ||
			sourcePath?.startsWith("input_data.");

		if (contractFields.includes(key) || isInputDataPath) {
			input_data[key] = value;
		} else {
			extra[key] = value;
		}
	};

	// 1. Map Shared Fields (from root)
	fieldSelection.shared.forEach((f) => {
		const sourceValue = getValueByPath(rootJson, f);
		const lastPart = f.split(".").pop() || f;
		addToBucket(lastPart, sourceValue, f);
	});

	// 2. Map Per-Task Fields (from task object)
	fieldSelection.perTask.forEach((f) => {
		const sourceValue = getValueByPath(task, f);
		const lastPart = f.split(".").pop() || f;

		// SMART UNROLL: If user selected 'input_data' object, unwrap it
		if (
			lastPart === "input_data" &&
			typeof sourceValue === "object" &&
			sourceValue !== null
		) {
			Object.entries(sourceValue).forEach(([k, v]) => {
				addToBucket(k, v, `input_data.${k}`);
			});
			return;
		}

		addToBucket(lastPart, sourceValue, f);
	});

	// 3. Apply Manual Mappings (Contract fields)
	Object.entries(fieldMapping).forEach(([contractField, value]) => {
		if (!value) return;

		let sourceValue: unknown;
		if (value.startsWith("static:")) {
			sourceValue = value.replace("static:", "");
		} else {
			const isShared = fieldSelection.shared.includes(value);
			sourceValue = isShared
				? getValueByPath(rootJson, value)
				: getValueByPath(task, value);
		}

		// Since it's from fieldMapping, the key is the contractField name
		addToBucket(contractField, sourceValue);
	});

	// 4. Ensure all contract fields exist in input_data (as null if missing)
	contractFields.forEach((field) => {
		if (!(field in input_data)) {
			input_data[field] = null;
		}
	});

	return { input_data, extra };
}
