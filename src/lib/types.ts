// Orchestrator Configuration Types
export interface OrchestratorConfig {
	id: string;
	name: string;
	description?: string;
	steps: StepConfig[];
	created_at: string;
	updated_at: string;
	hub_asset_id?: string;
	is_public?: boolean;
	created_by?: string;
	viewport?: { x: number; y: number; zoom: number };
	n8n_workflow_id?: string;
	input_mapping?: JsonInputMapping;
	execution_delay_seconds?: number;
}

export interface JsonInputMapping {
	fieldSelection: { shared: string[]; perTask: string[] };
	fieldMapping: Record<string, string>;
}

// Legacy Step Config - now supports both legacy webhook and new stage-based fields
export interface StepConfig {
	id: string;
	name: string; // 'A', 'B', 'C', 'D', 'E'
	label: string;
	dependsOn: string[];
	position?: { x: number; y: number };
	timeout?: number;
	retryConfig?: {
		maxRetries: number;
		retryDelay: number;
	};

	// Legacy webhook-based (optional for backward compat)
	webhookUrl?: string;
	webhookMethod?: "GET" | "POST";
	authConfig?: {
		type: "none" | "header";
		headerName?: string;
		headerValue?: string;
	};
	n8nWorkflowId?: string;

	// New stage-based (for N-Stage Orchestrator)
	stage_key?: string;
	task_type?: string;
	prompt_template_id?: string;
	cardinality?: Cardinality;
	ai_settings?: AISettings;
	requires_approval?: boolean;

	// Splitting & Routing (for 1:N cardinality)
	split_path?: string;
	split_mode?: "per_item" | "per_batch";
	batch_size?: number;
	batch_grouping?: "global" | "isolated";
	merge_path?: string;
	output_mapping?: string;

	// Context Passing
	return_along_with?: string[];

	// Pre/Post Process Hooks (Optional)
	pre_process?: PreProcessConfig;
	post_process?: PostProcessConfig;

	// Input/Output Contract (Optional)
	contract?: StageContract;

	// Custom Visual Component (Optional)
	custom_component_id?: string;

	// 🔨 Stage IO: Export Configuration
	export_config?: ExportConfig;
	auxiliary_inputs?: string[]; // IDs of DocumentAsset
}

export interface ExportConfig {
	enabled: boolean;
	destination: "google_sheets" | "webhook" | "email";
	settings: {
		sheet_id?: string;
		worksheet_name?: string;
		webhook_url?: string;
		email_recipient?: string;
		format?: "json" | "csv" | "tsv";
	};
}

// Pre-Process Hook Configuration
export type PreProcessOutputHandling = "replace" | "merge" | "nested";

export interface PreProcessConfig {
	enabled: boolean;
	type: "webhook" | "subworkflow";

	// Webhook config
	webhook_url?: string;
	webhook_method?: "GET" | "POST";
	webhook_headers?: Record<string, string>;

	// Subworkflow config
	n8n_workflow_id?: string;

	// Behavior
	on_failure: "abort" | "continue";
	output_handling: PreProcessOutputHandling;
	nested_field_name?: string; // Used when output_handling = 'nested'
}

// Post-Process Hook Configuration
export type PostProcessInputSource =
	| "output_only"
	| "input_and_output"
	| "custom";
export type PostProcessMode = "webhook" | "subworkflow" | "merge_with_input";

export interface PostProcessConfig {
	enabled: boolean;
	type: PostProcessMode;

	// Webhook config
	webhook_url?: string;
	webhook_method?: "GET" | "POST";
	webhook_headers?: Record<string, string>;

	// Subworkflow config
	n8n_workflow_id?: string;

	// Behavior
	on_failure: "abort" | "continue";
	input_source: PostProcessInputSource;
	custom_input_mapping?: string; // JSONPath expression when input_source = 'custom'

	// Merge config (for type = 'merge_with_input')
	merge_key?: string; // Field to match items by (e.g., 'code', 'lo_code')
	merge_array_path?: string; // Path to the array in output_data (e.g., 'output_data')
	input_array_path?: string; // Path to the array in input_data (e.g., 'output_data')
}

// N-Stage Orchestrator Types
export type Cardinality =
	| "1:1"
	| "1:N"
	| "N:1"
	| "one_to_one"
	| "one_to_many"
	| "many_to_one";
export type AIModel =
	| "gemini-flash-latest"
	| "gemini-pro-latest"
	| "gemini-2.0-flash"
	| "gemini-2.0-flash-lite"
	| "gemini-2.5-flash"
	| "gemini-2.5-flash-lite"
	| "gemini-2.5-pro"
	| "gemini-3-flash-preview";

export interface AISettings {
	model_id: AIModel;
	generate_content_api?: "generateContent" | "streamGenerateContent";
	generationConfig: {
		temperature?: number;
		topP?: number;
		topK?: number;
		maxOutputTokens?: number;
		responseMimeType?: "application/json" | "text/plain";
		thinkingLevel?: string;
		thinkingBudget?: number;
	};
}

export interface AIModelCapabilities {
	audio_generation?: boolean;
	batch_api?: boolean;
	caching?: boolean;
	code_execution?: boolean;
	file_search?: boolean;
	function_calling?: boolean;
	image_generation?: boolean;
	live_api?: boolean;
	search_grounding?: boolean;
	structured_outputs?: boolean;
	thinking?: boolean;
	url_context?: boolean;
	[key: string]: boolean | undefined;
}

export interface AIModelSetting {
	id: string;
	model_id: string;
	name: string;
	category?: string;
	tagline?: string;
	description?: string;
	supported_inputs?: string[];
	supported_outputs?: string[];
	input_token_limit?: number;
	output_token_limit?: number;
	capabilities?: AIModelCapabilities;
	thinking_config_type?: "level" | "budget" | "none";
	recommended_thinking?: string;
	temperature: number;
	top_p: number;
	top_k: number;
	max_output_tokens: number;
	generate_content_api?: string;
	timeout_ms: number;
	retries: number;
	is_active: boolean;
	free_tier_rpm?: number | null;
	free_tier_tpm?: number | null;
	free_tier_rpd?: number | null;
	use_case_tags?: string[];
	organization_code?: string;
	created_at: string;
	updated_at: string;
	hub_asset_id?: string;
	is_public?: boolean;
}

// Stage Input/Output Contract Types
export type InputFieldType =
	| "string"
	| "number"
	| "integer"
	| "boolean"
	| "array"
	| "object";
export type FormatInjectionMode = "append" | "prepend" | "none";
export type OutputValidationMode = "strict" | "loose" | "none";

export interface InputField {
	name: string;
	type: InputFieldType;
	required: boolean;
	description?: string;
}

/**
 * Gemini-compatible JSON Schema property.
 * Maps 1:1 to https://ai.google.dev/gemini-api/docs/structured-output#json_schema_support
 */
export interface JsonSchemaProperty {
	type: InputFieldType;
	description?: string;
	enum?: (string | number)[]; // For classification/enum fields
	items?: JsonSchemaProperty; // For array type: schema of each item
	properties?: Record<string, JsonSchemaProperty>; // For object type
	required?: string[]; // For object type: list of required property names
	nullable?: boolean; // Maps to {"type": ["string", "null"]}
}

/**
 * Root-level JSON Schema stored in DB `output_schema`.
 * Directly usable as `responseJsonSchema` in Gemini API.
 */
export interface GeminiJsonSchema extends JsonSchemaProperty {
	type: "object" | "array";
}

/** @deprecated Use JsonSchemaProperty instead. Kept for backward compatibility migration. */
export interface OutputSchemaField {
	name: string;
	type: InputFieldType;
	required?: boolean;
	description?: string;
	items?: OutputSchemaField;
	properties?: OutputSchemaField[];
}

export interface StageContract {
	input: {
		fields: InputField[];
		auto_extracted: boolean;
		delimiters?: {
			start: string;
			end: string;
		};
	};
	output: {
		schema?: GeminiJsonSchema; // Gemini-compatible JSON Schema
		format_injection: FormatInjectionMode;
		validation: OutputValidationMode;
	};
}

export interface DocumentAsset {
	id: string;
	name: string;
	file_path: string;
	file_type: "md" | "txt" | "csv" | "tsv";
	size_bytes: number;
	token_count_est: number;
	config_id?: string;
	user_id: string;
	storage_type: "supabase" | "indexeddb";
	created_at: string;
	updated_at: string;
}

export interface StageConfig {
	id: string;
	stage_key: string; // e.g. "stage_1", "qgen", "formatter"
	label: string;

	// AI Task Definition
	task_type: string; // Routing key for n8n Switch node
	prompt_template_name?: string; // Reference to stored prompt template
	ai_settings: AISettings;

	// Stage Relationship
	cardinality: Cardinality;
	dependsOn: string[]; // Stage IDs this depends on

	// Schema (optional)
	input_schema?: Record<string, unknown>;
	output_schema?: Record<string, unknown>;

	// Execution Config
	timeout?: number;
	retryConfig?: {
		maxRetries: number;
		retryDelay: number;
	};

	position?: { x: number; y: number };
}

// Syllabus Types
export interface SyllabusRow {
	lessonId: string;
	lessonTitle: string;
	objective: string;
	resources: Resource[];
	duration?: string;
	difficulty?: string;
}

export interface Resource {
	type: "video" | "documentation" | "article";
	url: string;
	title: string;
}

// Execution Types
export type ExecutionStatus =
	| "plan"
	| "pending"
	| "running"
	| "processing"
	| "awaiting_approval"
	| "approved"
	| "completed"
	| "generated"
	| "failed"
	| "cancelled"
	| "skipped";
export type StepStatus =
	| "plan"
	| "pending"
	| "running"
	| "processing"
	| "awaiting_approval"
	| "approved"
	| "completed"
	| "generated"
	| "failed"
	| "cancelled"
	| "skipped";

export interface Execution {
	id: string;
	config_id?: string; // Legacy
	orchestrator_config_id?: string; // New
	name?: string;
	syllabus_row?: SyllabusRow;
	status: ExecutionStatus;
	batch_type?: string; // New
	preset_key?: string; // New
	grade_code?: string; // New
	started_at?: string;
	completed_at?: string;
	error_message?: string;
	total_steps?: number;
	completed_steps?: number;
	failed_steps?: number;
	total_tasks?: number; // New
	completed_tasks?: number; // New
	failed_tasks?: number; // New
	processing_tasks?: number; // New
	launch_id?: string; // New
	created_at: string;
	updated_at: string;
	hub_asset_id?: string;
	is_public?: boolean;
	created_by?: string; // New
	execution_delay_seconds?: number;

	// Parity with task_batches table
	source_file?: string | null;
	exam_round_code?: string | null;
	week_range?: string | null;
	config?: Record<string, unknown> | null;
	n8n_workflow_id?: string | null;
	n8n_execution_id?: string | null;
	finished_tasks?: number;
	pending_tasks: number; // Added for parity
	global_context?: Record<string, unknown>; // 🔨 Snapshotting/Caching
}

export interface StepExecution {
	id: string;
	execution_id: string;
	step_id: string;
	step_name: string;
	status: StepStatus;
	started_at?: string;
	completed_at?: string;
	result?: StepResult;
	error_message?: string;
	retry_count: number;
	max_retries: number;
	n8n_execution_id?: string;
	duration_ms?: number;
	created_at: string;
	updated_at: string;
	hub_asset_id?: string;
	is_public?: boolean;
}

export interface StepResult {
	outputFiles?: OutputFile[];
	summary?: string;
	metadata?: Record<string, unknown>;
}

export interface OutputFile {
	type: string;
	filename: string;
	url: string;
	size: number;
}

// Designer Types
export interface DesignerNode {
	id: string;
	type: string;
	position: { x: number; y: number };
	data: StepConfig;
}

export interface DesignerEdge {
	id: string;
	source: string;
	target: string;
}

// JSON Launcher Input Types
export interface JsonGroupTask {
	metadata: Record<string, unknown>;
	tasks: unknown[];
}

export interface FieldSelection {
	shared: string[]; // Path strings
	perTask: string[]; // Path strings
}

export interface FieldMapping {
	/**
	 * Mapping of contract field name -> source JSON path OR static value configuration.
	 * If it's a string starting with "static:", it's a fixed value.
	 * Otherwise, it's a dot-notated path from the input JSON.
	 */
	[contractFieldName: string]: string;
}

// Auth and Role Types
export type UserRole = "user" | "admin" | "superadmin";

export interface UserProfile {
	id: string;
	email: string;
	full_name: string | null;
	role: UserRole;
	tier: "free" | "premium";
	avatar_url: string | null;
	username: string | null;
	settings: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}
