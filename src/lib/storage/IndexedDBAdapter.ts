import Dexie, { Table } from "dexie";
import {
	IStorageAdapter,
	PromptTemplate,
	CustomComponent,
	ApiKeyHealth,
	ApiKeyUsageLog,
} from "./StorageAdapter";
import {
	Execution as TaskBatch,
	OrchestratorConfig,
	DocumentAsset,
} from "../types";
import { TaskSummary as AiTask } from "../../services/executionTrackingService";
import { AIModelSetting } from "../types";

export interface RegistryComponent {
	id: string;
	name: string;
	description?: string | null;
	is_active?: boolean;
}

export interface MetadataValue {
	count: number;
	month: string;
}

export class OrchableDatabase extends Dexie {
	task_batches!: Table<TaskBatch>;
	ai_tasks!: Table<AiTask>;
	prompt_templates!: Table<PromptTemplate>;
	custom_components!: Table<CustomComponent>;
	registry_components!: Table<RegistryComponent>;
	orchestrator_configs!: Table<OrchestratorConfig>;
	metadata!: Table<{ key: string; value: MetadataValue }>;
	assets!: Table<{
		id: string;
		name: string;
		content: string;
		type: string;
		created_at: string;
	}>;
	document_assets!: Table<DocumentAsset>;
	user_api_keys!: Table<{
		id: string;
		key_name: string;
		api_key_encrypted: string;
		pool_type: "personal" | "free_pool" | "premium_pool";
		provider?: "gemini" | "deepseek" | "qwen" | "minimax";
		created_at: string;
		user_id: string;
	}>;
	ai_model_settings!: Table<AIModelSetting>;
	api_key_usage_log!: Table<{
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
		key_name?: string | null;
		used_at: string;
		metadata_json?: Record<string, unknown> | null;
		user_id?: string | null;
	}>;
	api_key_health!: Table<{
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
	}>;

	constructor() {
		super("orchable_db");
		this.version(7).stores({
			task_batches:
				"id, status, created_at, orchestrator_config_id, launch_id, execution_delay_seconds",
			ai_tasks:
				"id, batch_id, status, stage_key, [batch_id+stage_key], launch_id, [launch_id+stage_key]",
			prompt_templates: "id, name, stage_key, organization_code",
			custom_components: "id, name",
			metadata: "key", // for usage, config, etc.
			orchestrator_configs: "id, name, created_at",
			assets: "id, name, type",
			document_assets: "id, name, user_id, config_id",
			user_api_keys: "id, key_name, pool_type, user_id",
		});
		this.version(9).stores({
			task_batches:
				"id, status, created_at, orchestrator_config_id, launch_id, execution_delay_seconds",
		});
		this.version(10).stores({
			user_api_keys: "id, key_name, pool_type, user_id",
		});
		this.version(11).stores({
			ai_model_settings: "id, model_id, is_active",
		});
		this.version(12).stores({
			api_key_usage_log: "id, job_id, user_api_key_id, success, used_at",
		});
		this.version(13).stores({
			api_key_health:
				"user_api_key_id, blocked_until, updated_at, health_status",
		});
		this.version(14).stores({
			user_api_keys: "id, key_name, pool_type, user_id, provider",
		});
		this.version(15).stores({
			registry_components: "id, name, is_active",
		});
	}

	/**
	 * Atomic increment for metadata values (e.g. usage)
	 */
	async incrementMetadata(
		key: string,
		amount: number = 1,
	): Promise<MetadataValue> {
		return this.transaction("rw", this.metadata, async () => {
			const entry = await this.metadata.get(key);
			const newValue: MetadataValue = entry
				? { ...entry.value, count: (entry.value.count || 0) + amount }
				: {
						count: amount,
						month: new Date().toISOString().slice(0, 7),
					};
			await this.metadata.put({ key, value: newValue });
			return newValue;
		});
	}

	// Helper for logging (used by worker and adapter)
	async addApiKeyUsageLog(
		log: Omit<ApiKeyUsageLog, "id" | "used_at">,
	): Promise<void> {
		await this.api_key_usage_log.add({
			...log,
			id: crypto.randomUUID(),
			used_at: new Date().toISOString(),
		});
	}

	async getApiKeyUsageLogs(jobId: string): Promise<ApiKeyUsageLog[]> {
		return this.api_key_usage_log.where("job_id").equals(jobId).toArray();
	}

	async getApiKeyHealth(userApiKeyId: string) {
		return this.api_key_health.get(userApiKeyId);
	}

	async upsertApiKeyHealth(health: ApiKeyHealth) {
		await this.api_key_health.put(health);
	}
}

export const db = new OrchableDatabase();

export class IndexedDBAdapter implements IStorageAdapter {
	// Batches
	async createBatch(batch: Partial<TaskBatch>): Promise<TaskBatch> {
		const newBatch = {
			id: crypto.randomUUID(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			status: "pending",
			total_tasks: 0,
			completed_tasks: 0,
			failed_tasks: 0,
			...batch,
		} as TaskBatch;

		await db.task_batches.add(newBatch);
		return newBatch;
	}

	async listBatches(limit = 20): Promise<TaskBatch[]> {
		return db.task_batches
			.orderBy("created_at")
			.reverse()
			.limit(limit)
			.toArray();
	}

	async getBatch(id: string): Promise<TaskBatch | null> {
		return db.task_batches.get(id) || null;
	}

	async updateBatch(id: string, data: Partial<TaskBatch>): Promise<void> {
		await db.task_batches.update(id, {
			...data,
			updated_at: new Date().toISOString(),
		});
	}

	async upsertBatch(batch: TaskBatch): Promise<void> {
		await db.task_batches.put(batch);
	}

	async deleteBatch(id: string): Promise<void> {
		await db.transaction("rw", db.task_batches, db.ai_tasks, async () => {
			await db.ai_tasks.where("batch_id").equals(id).delete();
			await db.task_batches.delete(id);
		});
	}

	// Tasks
	async createTasks(tasks: Partial<AiTask>[]): Promise<AiTask[]> {
		const newTasks = tasks.map((t) => ({
			id: crypto.randomUUID(),
			created_at: new Date().toISOString(),
			status: "plan",
			...t,
		})) as AiTask[];

		await db.ai_tasks.bulkAdd(newTasks);
		return newTasks;
	}

	async listTasks(batchId: string): Promise<AiTask[]> {
		return db.ai_tasks.where("batch_id").equals(batchId).toArray();
	}

	async updateTask(id: string, data: Partial<AiTask>): Promise<void> {
		await db.ai_tasks.update(id, data);
	}

	async upsertTasks(tasks: AiTask[]): Promise<void> {
		await db.ai_tasks.bulkPut(tasks);
	}

	async getPendingTasks(): Promise<AiTask[]> {
		return db.ai_tasks.where("status").equals("plan").toArray();
	}

	// Prompt Templates
	async listTemplates(): Promise<PromptTemplate[]> {
		return db.prompt_templates.toArray();
	}

	async getTemplate(id: string): Promise<PromptTemplate | null> {
		return db.prompt_templates.get(id) || null;
	}

	async upsertTemplate(template: PromptTemplate): Promise<void> {
		await db.prompt_templates.put(template);
	}

	async deleteTemplate(id: string): Promise<void> {
		await db.prompt_templates.delete(id);
	}

	// Custom Components
	async listComponents(): Promise<CustomComponent[]> {
		return db.custom_components.toArray();
	}

	async getComponent(id: string): Promise<CustomComponent | null> {
		return db.custom_components.get(id) || null;
	}

	async upsertComponent(component: CustomComponent): Promise<void> {
		await db.custom_components.put(component);
	}

	async deleteComponent(id: string): Promise<void> {
		await db.custom_components.delete(id);
	}

	// AI Model Settings
	async listAiModelSettings(): Promise<import("../types").AIModelSetting[]> {
		return db.ai_model_settings.toArray();
	}

	async getAiModelSetting(
		id: string,
	): Promise<import("../types").AIModelSetting | null> {
		const setting = await db.ai_model_settings.get(id);
		return setting || null;
	}

	async upsertAiModelSetting(
		setting: import("../types").AIModelSetting,
	): Promise<void> {
		await db.ai_model_settings.put(setting);
	}

	async deleteAiModelSetting(id: string): Promise<void> {
		await db.ai_model_settings.delete(id);
	}

	// Configs
	async saveConfig(
		config: Partial<OrchestratorConfig>,
	): Promise<OrchestratorConfig> {
		const newConfig = {
			id: crypto.randomUUID(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			...config,
		} as OrchestratorConfig;

		await db.orchestrator_configs.add(newConfig);
		return newConfig;
	}

	async upsertConfig(config: Partial<OrchestratorConfig>): Promise<void> {
		if (config.id) {
			const existing = await db.orchestrator_configs.get(config.id);
			if (existing) {
				await db.orchestrator_configs.put({
					...existing,
					...config,
					updated_at: new Date().toISOString(),
				});
				return;
			}
		}

		const newConfig = {
			id: config.id || crypto.randomUUID(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			...config,
		} as OrchestratorConfig;

		await db.orchestrator_configs.put(newConfig);
	}

	async listConfigs(): Promise<OrchestratorConfig[]> {
		return db.orchestrator_configs
			.orderBy("created_at")
			.reverse()
			.toArray();
	}

	async getConfig(id: string): Promise<OrchestratorConfig | null> {
		const config = await db.orchestrator_configs.get(id);
		return config || null;
	}

	async updateConfig(
		id: string,
		updates: Partial<OrchestratorConfig>,
	): Promise<OrchestratorConfig> {
		const existing = await db.orchestrator_configs.get(id);

		if (!existing) {
			const newConfig = {
				id,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				...updates,
			} as OrchestratorConfig;

			await db.orchestrator_configs.put(newConfig);
			return newConfig;
		}

		await db.orchestrator_configs.update(id, {
			...updates,
			updated_at: new Date().toISOString(),
		});
		const updated = await db.orchestrator_configs.get(id);
		if (!updated) throw new Error("Config not found after update");
		return updated;
	}

	async deleteConfig(id: string): Promise<void> {
		await db.orchestrator_configs.delete(id);
	}

	// Assets
	async createAsset(asset: Partial<DocumentAsset>): Promise<DocumentAsset> {
		const newAsset = {
			id: crypto.randomUUID(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			...asset,
		} as DocumentAsset;

		await db.document_assets.add(newAsset);
		return newAsset;
	}

	async listAssets(): Promise<DocumentAsset[]> {
		return db.document_assets.orderBy("created_at").reverse().toArray();
	}

	async getAsset(id: string): Promise<DocumentAsset | null> {
		return db.document_assets.get(id) || null;
	}

	async deleteAsset(id: string): Promise<void> {
		await db.transaction("rw", db.document_assets, db.assets, async () => {
			const asset = await db.document_assets.get(id);
			if (asset && asset.storage_type === "indexeddb") {
				// Strip "local://documents/" to find the asset id in db.assets
				const blobId = asset.file_path.replace(
					"local://documents/",
					"",
				);
				await db.assets.delete(blobId);
			}
			await db.document_assets.delete(id);
		});
	}

	async getAssetContent(asset: DocumentAsset): Promise<string> {
		if (asset.storage_type === "indexeddb") {
			const blobId = asset.file_path.replace("local://documents/", "");
			const blob = await db.assets.get(blobId);
			return blob?.content || "";
		}
		throw new Error("Supabase assets not supported in IndexedDBAdapter");
	}

	async saveAsset(
		name: string,
		content: string,
		type: string,
	): Promise<string> {
		const assetId = `${Date.now()}_${name}`;

		await db.assets.add({
			id: assetId,
			name,
			content,
			type,
			created_at: new Date().toISOString(),
		});

		return `local://documents/${assetId}`;
	}

	// API Keys
	async listKeys(): Promise<
		{
			id: string;
			key_name: string;
			pool_type: "personal" | "free_pool" | "premium_pool";
			provider?: "gemini" | "deepseek" | "qwen" | "minimax";
			created_at: string;
		}[]
	> {
		return db.user_api_keys.toArray();
	}

	async upsertKey(key: {
		id: string;
		key_name: string;
		api_key_encrypted: string;
		pool_type: "personal" | "free_pool" | "premium_pool";
		provider?: "gemini" | "deepseek" | "qwen" | "minimax";
		user_id: string;
	}): Promise<void> {
		await db.user_api_keys.put({
			...key,
			created_at: new Date().toISOString(),
		});
	}

	async deleteKey(id: string): Promise<void> {
		await db.user_api_keys.delete(id);
	}

	// API Usage Logs (Mirror of Supabase)
	async addApiKeyUsageLog(
		log: Omit<ApiKeyUsageLog, "id" | "used_at">,
	): Promise<void> {
		await db.addApiKeyUsageLog(log);
	}

	async getApiKeyUsageLogs(jobId: string): Promise<ApiKeyUsageLog[]> {
		return db.getApiKeyUsageLogs(jobId);
	}

	async getApiKeyHealth(userApiKeyId: string): Promise<ApiKeyHealth | null> {
		return db.getApiKeyHealth(userApiKeyId);
	}

	async upsertApiKeyHealth(health: ApiKeyHealth): Promise<void> {
		await db.upsertApiKeyHealth(health);
	}
}
