import { storage, UserTier } from "@/lib/storage";
import { Execution, StepExecution, SyllabusRow } from "@/lib/types";
import { batchService } from "./batchService";

export const executionService = {
	async createExecution(data: {
		configId: string;
		syllabusRow: SyllabusRow;
		tier: UserTier;
	}): Promise<Execution> {
		const { configId, syllabusRow, tier } = data;
		const configs = await storage.adapter.listConfigs();
		const config = configs?.find((c) => c.id === configId);
		if (!config) throw new Error("Config not found");

		const { batch } = await batchService.createLaunch({
			config,
			inputItems: [syllabusRow as any],
			batchName: syllabusRow.lessonTitle || "Untitled Execution",
			tier,
		});

		return batch as unknown as Execution;
	},

	async listExecutions(): Promise<Execution[]> {
		const { supabase } = await import("@/lib/supabase");
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) {
			const { data } = await supabase
				.from("task_batches")
				.select("*")
				.eq("created_by", user.id)
				.order("created_at", { ascending: false })
				.limit(40);
			return (data || []) as unknown as Execution[];
		}
		return storage.adapter.listBatches() as unknown as Promise<Execution[]>;
	},

	async getExecution(id: string): Promise<Execution> {
		const batch = await storage.adapter.getBatch(id);
		if (!batch) throw new Error("Execution not found");
		return batch as unknown as Execution;
	},

	async updateExecutionStatus(
		id: string,
		status: Execution["status"],
		additionalData?: Partial<Execution>,
	): Promise<void> {
		await storage.adapter.updateBatch(id, {
			status: status as any,
			...additionalData,
		});
	},

	async getStepExecutions(executionId: string) {
		// Map to tasks
		const tasks = await storage.adapter.listTasks(executionId);
		return tasks.map((t) => ({
			id: t.id,
			execution_id: t.batch_id,
			step_id: t.stage_key,
			step_name: t.stage_key,
			status: t.status as any,
			retry_count: 0,
			max_retries: 3,
			created_at: t.created_at || new Date().toISOString(),
			updated_at: t.updated_at || new Date().toISOString(),
			result: t.output_data
				? { summary: JSON.stringify(t.output_data) }
				: undefined,
			error_message: t.error_message,
		})) as StepExecution[];
	},

	async listAiTasks(): Promise<any[]> {
		const { supabase } = await import("@/lib/supabase");
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) {
			const { data } = await supabase
				.from("ai_tasks")
				.select(
					"id, task_type, status, created_at, error_message, batch_id, input_data, output_data, extra, user_id",
				)
				.eq("user_id", user.id)
				.order("created_at", { ascending: false })
				.limit(100);
			return data || [];
		}
		// IndexedDB fallback for unauthenticated / lite users
		const adapter = storage.adapter;
		if (adapter.constructor.name === "IndexedDBAdapter") {
			const db = await import("@/lib/storage/IndexedDBAdapter").then(
				(m) => m.db,
			);
			return db.ai_tasks.toArray();
		}
		return [];
	},
};
