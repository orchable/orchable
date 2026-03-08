import { supabase } from "../supabase";
import {
	IStorageAdapter,
	PromptTemplate,
	CustomComponent,
} from "./StorageAdapter";
import {
	Execution as TaskBatch,
	OrchestratorConfig,
	DocumentAsset,
} from "../types";
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
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) return [];

		const { data, error } = await supabase
			.from("task_batches")
			.select("*")
			.eq("created_by", user.id)
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

	async createTasks(tasks: Partial<AiTask>[]): Promise<AiTask[]> {
		// 1. If any task is 'free_pool', use the quota-enforcing RPC
		const isFreePool = tasks.some((t) => t.tier_source === "free_pool");

		if (isFreePool) {
			const { data, error } = await supabase.rpc(
				"submit_free_tier_tasks",
				{
					p_tasks: tasks,
				},
			);

			if (error) throw error;
			if (!data.success) {
				// The UI/Executor will catch this and show the upgrade modal
				throw new Error(data.error || "QUOTA_EXCEEDED");
			}

			// The RPC created the tasks. We return empty or fetch them if needed.
			// For now, return empty as the UI usually refreshes via subscription.
			return [];
		}

		// 2. Normal direct insert for other tiers/sources
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
		const {
			data: { user },
		} = await supabase.auth.getUser();

		const { error } = await supabase.from("prompt_templates").upsert({
			...template,
			created_by: template.created_by || user?.id,
		});

		if (error) {
			console.error(
				"[SupabaseAdapter] Failed to upsert template:",
				error,
			);
			throw error;
		}
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

		if (error) {
			console.error("[SupabaseAdapter] Failed to save config:", error);
			throw error;
		}
		return data as OrchestratorConfig;
	}

	async upsertConfig(config: Partial<OrchestratorConfig>): Promise<void> {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		const { error } = await supabase
			.from("lab_orchestrator_configs")
			.upsert({
				...config,
				created_by: config.created_by || user?.id,
			});

		if (error) throw error;
	}

	async listConfigs(): Promise<OrchestratorConfig[]> {
		// RLS handles user isolation — no client-side filtering needed
		const { data, error } = await supabase
			.from("lab_orchestrator_configs")
			.select("*")
			.order("created_at", { ascending: false });

		if (error) throw error;
		return data as OrchestratorConfig[];
	}

	async getConfig(id: string): Promise<OrchestratorConfig | null> {
		// RLS handles user isolation — no client-side filtering needed
		const { data, error } = await supabase
			.from("lab_orchestrator_configs")
			.select("*")
			.eq("id", id)
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

		if (error) {
			console.error("[SupabaseAdapter] Failed to update config:", error, {
				id,
				updates,
			});
			throw error;
		}
		return data as OrchestratorConfig;
	}

	async deleteConfig(id: string): Promise<void> {
		const { error } = await supabase
			.from("lab_orchestrator_configs")
			.delete()
			.eq("id", id);

		if (error) throw error;
	}

	// Assets
	async createAsset(asset: Partial<DocumentAsset>): Promise<DocumentAsset> {
		const { data, error } = await supabase
			.from("document_assets")
			.insert(asset)
			.select()
			.single();

		if (error) throw error;
		return data as DocumentAsset;
	}

	async listAssets(): Promise<DocumentAsset[]> {
		const { data, error } = await supabase
			.from("document_assets")
			.select("*")
			.order("created_at", { ascending: false });

		if (error) throw error;
		return data as DocumentAsset[];
	}

	async getAsset(id: string): Promise<DocumentAsset | null> {
		const { data, error } = await supabase
			.from("document_assets")
			.select("*")
			.eq("id", id)
			.maybeSingle();

		if (error) throw error;
		return data as DocumentAsset;
	}

	async deleteAsset(id: string): Promise<void> {
		// 1. Get asset to find file path
		const asset = await this.getAsset(id);
		if (!asset) return;

		// 2. Delete from storage if it's a supabase storage asset
		if (asset.storage_type === "supabase") {
			const path = asset.file_path.split("/").slice(-2).join("/"); // userId/fileName
			await supabase.storage.from("documents").remove([path]);
		}

		// 3. Delete DB record
		const { error } = await supabase
			.from("document_assets")
			.delete()
			.eq("id", id);

		if (error) throw error;
	}

	async getAssetContent(asset: DocumentAsset): Promise<string> {
		if (asset.storage_type === "supabase") {
			// Extract relative path from public URL or use specific logic
			// publicUrl: .../storage/v1/object/public/documents/userId/fileName
			const path = asset.file_path.split("/").slice(-2).join("/");

			const { data, error } = await supabase.storage
				.from("documents")
				.download(path);

			if (error) throw error;
			return await data.text();
		}

		throw new Error("Local assets not supported in SupabaseAdapter");
	}

	async saveAsset(
		name: string,
		content: string,
		type: string,
	): Promise<string> {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) throw new Error("Unauthorized");

		const fileName = `${Date.now()}_${name}`;
		const filePath = `${user.id}/${fileName}`;
		const blob = new Blob([content], { type: "text/plain" });

		const { data, error } = await supabase.storage
			.from("documents")
			.upload(filePath, blob);

		if (error) throw error;

		const {
			data: { publicUrl },
		} = supabase.storage.from("documents").getPublicUrl(data.path);

		return publicUrl;
	}

	// API Keys & Health
	async listKeys(): Promise<Record<string, unknown>[]> {
		const { data, error } = await supabase
			.from("user_api_keys")
			.select("*");
		if (error) throw error;
		return data as Record<string, unknown>[];
	}

	async getApiKeyHealth(
		userApiKeyId: string,
	): Promise<import("./StorageAdapter").ApiKeyHealth | null> {
		const { data, error } = await supabase
			.from("api_key_health")
			.select("*")
			.eq("user_api_key_id", userApiKeyId)
			.maybeSingle();

		if (error) throw error;
		return data;
	}

	async upsertApiKeyHealth(
		health: import("./StorageAdapter").ApiKeyHealth,
	): Promise<void> {
		const { error } = await supabase.from("api_key_health").upsert(health);

		if (error) throw error;
	}
}
