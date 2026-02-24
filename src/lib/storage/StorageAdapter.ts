import { OrchestratorConfig, Execution as TaskBatch } from "../types";
import { TaskSummary as AiTask } from "../../services/executionTrackingService";

import { StepConfig } from "../types";

export interface PromptTemplate {
	id: string;
	name: string;
	description?: string;
	template: string;
	version: number;
	is_active: boolean;
	default_ai_settings?: Record<string, any>;
	next_stage_template_ids?: string[];
	organization_code?: string;
	input_schema?: Record<string, any>;
	output_schema?: Record<string, any>;
	stage_config?: Record<string, any>;
	requires_approval?: boolean;
	custom_component_id?: string;
	view_config?: Record<string, any>;
	next_stage_template_id?: string; // Legacy parity
	created_at?: string;
	updated_at?: string;
}

export interface CustomComponent {
	id: string;
	name: string;
	description?: string;
	code: string;
	mock_data?: Record<string, any>;
	is_public: boolean;
	created_at?: string;
	updated_at?: string;
	created_by?: string;
}

export interface IStorageAdapter {
	// Batches
	createBatch(batch: Partial<TaskBatch>): Promise<TaskBatch>;
	upsertBatch(batch: TaskBatch): Promise<void>;
	listBatches(limit?: number): Promise<TaskBatch[]>;
	getBatch(id: string): Promise<TaskBatch | null>;
	updateBatch(id: string, data: Partial<TaskBatch>): Promise<void>;
	deleteBatch(id: string): Promise<void>;

	// Tasks
	createTasks(tasks: Partial<AiTask>[]): Promise<AiTask[]>;
	upsertTasks(tasks: AiTask[]): Promise<void>;
	listTasks(batchId: string): Promise<AiTask[]>;
	updateTask(id: string, data: Partial<AiTask>): Promise<void>;
	getPendingTasks(): Promise<AiTask[]>;

	// Prompt Templates
	listTemplates(): Promise<PromptTemplate[]>;
	getTemplate(id: string): Promise<PromptTemplate | null>;
	upsertTemplate(template: PromptTemplate): Promise<void>;

	// Custom Components
	listComponents(): Promise<CustomComponent[]>;
	getComponent(id: string): Promise<CustomComponent | null>;
	upsertComponent(component: CustomComponent): Promise<void>;

	// Configs
	saveConfig(
		config: Partial<OrchestratorConfig>,
	): Promise<OrchestratorConfig>;
	listConfigs(): Promise<OrchestratorConfig[]>;
	getConfig(id: string): Promise<OrchestratorConfig | null>;
	updateConfig(
		id: string,
		updates: Partial<OrchestratorConfig>,
	): Promise<OrchestratorConfig>;
	deleteConfig(id: string): Promise<void>;
}
