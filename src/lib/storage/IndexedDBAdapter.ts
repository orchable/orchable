import Dexie, { Table } from "dexie";
import {
	IStorageAdapter,
	PromptTemplate,
	CustomComponent,
} from "./StorageAdapter";
import { Execution as TaskBatch, OrchestratorConfig } from "../types";
import { TaskSummary as AiTask } from "../../services/executionTrackingService";

export interface MetadataValue {
	count: number;
	month: string;
}

export class OrchableDatabase extends Dexie {
	task_batches!: Table<TaskBatch>;
	ai_tasks!: Table<AiTask>;
	prompt_templates!: Table<PromptTemplate>;
	custom_components!: Table<CustomComponent>;
	orchestrator_configs!: Table<OrchestratorConfig>;
	metadata!: Table<{ key: string; value: MetadataValue }>;

	constructor() {
		super("orchable_db");
		this.version(5).stores({
			task_batches:
				"id, status, created_at, orchestrator_config_id, launch_id",
			ai_tasks:
				"id, batch_id, status, stage_key, [batch_id+stage_key], launch_id",
			prompt_templates: "id, name, stage_key, organization_code",
			custom_components: "id, name",
			metadata: "key", // for usage, config, etc.
			orchestrator_configs: "id, name, created_at",
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
}
