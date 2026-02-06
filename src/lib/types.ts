// Orchestrator Configuration Types
export interface OrchestratorConfig {
  id: string;
  name: string;
  description?: string;
  steps: StepConfig[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  viewport?: { x: number; y: number; zoom: number };
  n8n_workflow_id?: string;
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
  webhookMethod?: 'GET' | 'POST';
  authConfig?: {
    type: 'none' | 'header';
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
  
  // Splitting & Routing (for 1:N cardinality)
  split_path?: string;
  split_mode?: 'per_item' | 'per_batch';
  output_mapping?: string;
  
  // Context Passing
  return_along_with?: string[];
  
  // Pre/Post Process Hooks (Optional)
  pre_process?: PreProcessConfig;
  post_process?: PostProcessConfig;
  
  // Input/Output Contract (Optional)
  contract?: StageContract;
}

// Pre-Process Hook Configuration
export type PreProcessOutputHandling = 'replace' | 'merge' | 'nested';

export interface PreProcessConfig {
  enabled: boolean;
  type: 'webhook' | 'subworkflow';
  
  // Webhook config
  webhook_url?: string;
  webhook_method?: 'GET' | 'POST';
  webhook_headers?: Record<string, string>;
  
  // Subworkflow config  
  n8n_workflow_id?: string;
  
  // Behavior
  on_failure: 'abort' | 'continue';
  output_handling: PreProcessOutputHandling;
  nested_field_name?: string; // Used when output_handling = 'nested'
}

// Post-Process Hook Configuration
export type PostProcessInputSource = 'output_only' | 'input_and_output' | 'custom';

export interface PostProcessConfig {
  enabled: boolean;
  type: 'webhook' | 'subworkflow';
  
  // Webhook config
  webhook_url?: string;
  webhook_method?: 'GET' | 'POST';
  webhook_headers?: Record<string, string>;
  
  // Subworkflow config
  n8n_workflow_id?: string;
  
  // Behavior
  on_failure: 'abort' | 'continue';
  input_source: PostProcessInputSource;
  custom_input_mapping?: string; // JSONPath expression when input_source = 'custom'
}

// N-Stage Orchestrator Types
export type Cardinality = '1:1' | '1:N' | 'N:1';
export type AIModel = 'gemini-flash-latest' | 'gemini-pro-latest';

export interface AISettings {
  model_id: AIModel;
  generationConfig: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    generate_content_api?: 'generateContent' | 'streamGenerateContent';
  };
}

// Stage Input/Output Contract Types
export type InputFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';
export type FormatInjectionMode = 'append' | 'prepend' | 'none';
export type OutputValidationMode = 'strict' | 'loose' | 'none';

export interface InputField {
  name: string;
  type: InputFieldType;
  required: boolean;
  description?: string;
}

export interface OutputSchemaField {
  name: string;
  type: InputFieldType;
  required?: boolean;
  description?: string;
  items?: OutputSchemaField;      // For array type: schema of array items
  properties?: OutputSchemaField[]; // For object type: nested fields
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
    schema?: OutputSchemaField[];   // Root-level fields
    rootType?: 'object' | 'array';  // Root type of output
    format_injection: FormatInjectionMode;
    validation: OutputValidationMode;
  };
}

export interface StageConfig {
  id: string;
  stage_key: string;           // e.g. "stage_1", "qgen", "formatter"
  label: string;
  
  // AI Task Definition
  task_type: string;           // Routing key for n8n Switch node
  prompt_template_name?: string; // Reference to stored prompt template
  ai_settings: AISettings;
  
  // Stage Relationship
  cardinality: Cardinality;
  dependsOn: string[];         // Stage IDs this depends on
  
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
  type: 'video' | 'documentation' | 'article';
  url: string;
  title: string;
}

// Execution Types
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface Execution {
  id: string;
  config_id: string;
  syllabus_row: SyllabusRow;
  status: ExecutionStatus;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  created_at: string;
  updated_at: string;
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
  metadata: Record<string, any>;
  tasks: any[];
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
