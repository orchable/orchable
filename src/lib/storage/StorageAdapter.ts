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
	default_ai_settings?: Record<string, unknown>;
	next_stage_template_ids?: string[];
	organization_code?: string;
	input_schema?: Record<string, unknown>;
	output_schema?: Record<string, unknown>;
	stage_config?: Record<string, unknown>;
	requires_approval?: boolean;
	custom_component_id?: string;
	view_config?: Record<string, unknown>;
	next_stage_template_id?: string; // Legacy parity
	stage_key?: string; // New: for orchestration routing
	created_by?: string; // New: metadata
	created_at?: string;
	updated_at?: string;
	is_public?: boolean;
	hub_asset_id?: string;
}

export interface CustomComponent {
	id: string;
	name: string;
	description?: string;
	code: string;
	mock_data?: Record<string, unknown>;
	is_public?: boolean;
	created_at?: string;
	updated_at?: string;
	created_by?: string;
	hub_asset_id?: string;
}

export interface ApiKeyHealth {
	user_api_key_id: string;
	last_used_at?: string | null;
	last_success_at?: string | null;
	last_failure_at?: string | null;
	consecutive_failures: number;
	total_requests: number;
	successful_requests: number;
	failed_requests: number;
	health_status?: string | null;
	blocked_until?: string | null;
	block_reason?: string | null;
	last_error_code?: string | null;
	updated_at: string;
	user_id?: string | null;
}

export interface ApiKeyUsageLog {
	id: string;
	user_api_key_id: string;
	task_id?: string | null;
	job_id?: string | null;
	request_type?: string | null;
	model_used?: string | null;
	tokens_used?: number | null;
	success?: boolean | null;
	error_code?: string | null;
	error_message?: string | null;
	latency_ms?: number | null;
	used_at: string;
	metadata_json?: Record<string, unknown> | null;
	user_id?: string | null;
	key_name?: string | null;
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
	deleteTemplate(id: string): Promise<void>;

	// Custom Components
	listComponents(): Promise<CustomComponent[]>;
	getComponent(id: string): Promise<CustomComponent | null>;
	upsertComponent(component: CustomComponent): Promise<void>;
	deleteComponent(id: string): Promise<void>;

	// AI Model Settings
	listAiModelSettings(): Promise<import("../types").AIModelSetting[]>;
	upsertAiModelSetting(
		setting: import("../types").AIModelSetting,
	): Promise<void>;
	deleteAiModelSetting(id: string): Promise<void>;

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

	// Assets
	createAsset(
		asset: Partial<import("../types").DocumentAsset>,
	): Promise<import("../types").DocumentAsset>;
	listAssets(): Promise<import("../types").DocumentAsset[]>;
	getAsset(id: string): Promise<import("../types").DocumentAsset | null>;
	deleteAsset(id: string): Promise<void>;
	getAssetContent(asset: import("../types").DocumentAsset): Promise<string>;
	saveAsset(name: string, content: string, type: string): Promise<string>;

	// API Keys & Health
	listKeys(): Promise<Record<string, unknown>[]>;
	getApiKeyHealth(userApiKeyId: string): Promise<ApiKeyHealth | null>;
	upsertApiKeyHealth(health: ApiKeyHealth): Promise<void>;

	// AI Model Settings
	listAiModelSettings(): Promise<import("../types").AIModelSetting[]>;
	upsertAiModelSetting(
		setting: import("../types").AIModelSetting,
	): Promise<void>;
	deleteAiModelSetting(id: string): Promise<void>;
}
