// Orchestrator Configuration Types
export interface OrchestratorConfig {
  id: string;
  name: string;
  description?: string;
  steps: StepConfig[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface StepConfig {
  id: string;
  name: string; // 'A', 'B', 'C', 'D', 'E'
  label: string;
  webhookUrl: string;
  webhookMethod?: 'GET' | 'POST';
  dependsOn: string[];
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
  authConfig?: {
    type: 'none' | 'header';
    headerName?: string;
    headerValue?: string;
  };
  n8nWorkflowId?: string;
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
