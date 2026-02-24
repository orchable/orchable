import { OrchestratorConfig, Execution as TaskBatch } from "../types";
import { TaskSummary as AiTask } from "../../services/executionTrackingService";

import { StepConfig } from "../types";

export interface PromptTemplate {
	id: string;
	name: string;
	stage_key: string;
	task_type: string;
	prompt_text: string;
	stage_config?: Partial<StepConfig>;
	next_stage_template_ids?: string[];
	created_at: string;
	updated_at: string;
}

export interface CustomComponent {
	id: string;
	name: string;
	code: string;
	created_at: string;
	updated_at: string;
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
}
