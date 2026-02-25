import { supabase } from "../supabase";
import {
	IStorageAdapter,
	PromptTemplate,
	CustomComponent,
} from "./StorageAdapter";
import { Execution as TaskBatch, OrchestratorConfig } from "../types";
import { TaskSummary as AiTask } from "../../services/executionTrackingService";

export class SupabaseAdapter implements IStorageAdapter {
	// Batches
	async createBatch(batch: Partial<TaskBatch>): Promise<TaskBatch> {
		const { data, error } = await supabase
			.from("task_batches")
			.insert(batch)
			.select()
			.single();

		if (error) throw error;
		return data as TaskBatch;
	}

	async listBatches(limit = 20): Promise<TaskBatch[]> {
		const { data, error } = await supabase
			.from("task_batches")
			.select("*")
			.order("created_at", { ascending: false })
			.limit(limit);

		if (error) throw error;
		return data as TaskBatch[];
	}

	async getBatch(id: string): Promise<TaskBatch | null> {
		const { data, error } = await supabase
			.from("task_batches")
			.select("*")
			.eq("id", id)
			.maybeSingle();

		if (error) throw error;
		return data as TaskBatch;
	}

	async updateBatch(id: string, data: Partial<TaskBatch>): Promise<void> {
		const { error } = await supabase
			.from("task_batches")
			.update(data)
			.eq("id", id);

		if (error) throw error;
	}

	async upsertBatch(batch: TaskBatch): Promise<void> {
		const { error } = await supabase.from("task_batches").upsert(batch);

		if (error) throw error;
	}

	async deleteBatch(id: string): Promise<void> {
		const { error } = await supabase
			.from("task_batches")
			.delete()
			.eq("id", id);

		if (error) throw error;
	}

	// Tasks
	async createTasks(tasks: Partial<AiTask>[]): Promise<AiTask[]> {
		const { data, error } = await supabase
			.from("ai_tasks")
			.insert(tasks)
			.select();

		if (error) throw error;
		return data as AiTask[];
	}

	async listTasks(batchId: string): Promise<AiTask[]> {
		const { data, error } = await supabase
			.from("ai_tasks")
			.select("*")
			.eq("batch_id", batchId);

		if (error) throw error;
		return data as AiTask[];
	}

	async updateTask(id: string, data: Partial<AiTask>): Promise<void> {
		const { error } = await supabase
			.from("ai_tasks")
			.update(data)
			.eq("id", id);

		if (error) throw error;
	}

	async upsertTasks(tasks: AiTask[]): Promise<void> {
		const { error } = await supabase.from("ai_tasks").upsert(tasks);

		if (error) throw error;
	}

	async getPendingTasks(): Promise<AiTask[]> {
		const { data, error } = await supabase
			.from("ai_tasks")
			.select("*")
			.eq("status", "plan");

		if (error) throw error;
		return data as AiTask[];
	}

	// Prompt Templates
	async listTemplates(): Promise<PromptTemplate[]> {
		const { data, error } = await supabase
			.from("prompt_templates")
			.select("*");

		if (error) throw error;
		return data as PromptTemplate[];
	}

	async getTemplate(id: string): Promise<PromptTemplate | null> {
		const { data, error } = await supabase
			.from("prompt_templates")
			.select("*")
			.eq("id", id)
			.maybeSingle();

		if (error) throw error;
		return data as PromptTemplate;
	}

	async upsertTemplate(template: PromptTemplate): Promise<void> {
		const { error } = await supabase
			.from("prompt_templates")
			.upsert(template);

		if (error) throw error;
	}

	// Custom Components
	async listComponents(): Promise<CustomComponent[]> {
		const { data, error } = await supabase
			.from("custom_components")
			.select("*");

		if (error) throw error;
		return data as CustomComponent[];
	}

	async getComponent(id: string): Promise<CustomComponent | null> {
		const { data, error } = await supabase
			.from("custom_components")
			.select("*")
			.eq("id", id)
			.maybeSingle();

		if (error) throw error;
		return data as CustomComponent;
	}

	async upsertComponent(component: CustomComponent): Promise<void> {
		const { error } = await supabase
			.from("custom_components")
			.upsert(component);

		if (error) throw error;
	}

	// Configs
	async saveConfig(
		config: Partial<OrchestratorConfig>,
	): Promise<OrchestratorConfig> {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		const { data, error } = await supabase
			.from("lab_orchestrator_configs")
			.insert({
				...config,
				created_by: user?.id,
			})
			.select()
			.single();

		if (error) throw error;
		return data as OrchestratorConfig;
	}

	async listConfigs(): Promise<OrchestratorConfig[]> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return [];

		const { data, error } = await supabase
			.from("lab_orchestrator_configs")
			.select("*")
			.or(`created_by.eq.${user.id},created_by.is.null`)
			.order("created_at", { ascending: false });

		if (error) throw error;
		return data as OrchestratorConfig[];
	}

	async getConfig(id: string): Promise<OrchestratorConfig | null> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return null;

		const { data, error } = await supabase
			.from("lab_orchestrator_configs")
			.select("*")
			.eq("id", id)
			.or(`created_by.eq.${user.id},created_by.is.null`)
			.maybeSingle();

		if (error) throw error;
		return data as OrchestratorConfig;
	}

	async updateConfig(
		id: string,
		updates: Partial<OrchestratorConfig>,
	): Promise<OrchestratorConfig> {
		const { data, error } = await supabase
			.from("lab_orchestrator_configs")
			.update({
				...updates,
				updated_at: new Date().toISOString(),
			})
			.eq("id", id)
			.select()
			.single();

		if (error) throw error;
		return data as OrchestratorConfig;
	}

	async deleteConfig(id: string): Promise<void> {
		const { error } = await supabase
			.from("lab_orchestrator_configs")
			.delete()
			.eq("id", id);

		if (error) throw error;
	}
}
