import { storage } from "@/lib/storage";
import { Execution, StepExecution, SyllabusRow } from "@/lib/types";

export const executionService = {
	async createExecution(data: {
		configId: string;
		syllabusRow: SyllabusRow;
	}): Promise<Execution> {
		const adapter = storage.adapter;
		return adapter.createBatch({
			name: data.syllabusRow.lessonTitle || "Untitled Execution",
			orchestrator_config_id: data.configId,
			syllabus_row: data.syllabusRow as any,
			status: "pending",
			total_tasks: 0,
			completed_tasks: 0,
			failed_tasks: 0,
		}) as unknown as Promise<Execution>;
	},

	async listExecutions(): Promise<Execution[]> {
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
		const adapter = storage.adapter;
		// For Lite users, we can list all tasks from IndexedDB.
		// For Premium, this is usually handled by Supabase views or specific queries,
		// but we'll provide a local fallback if using IndexedDBAdapter.
		if (adapter.constructor.name === "IndexedDBAdapter") {
			const db = await import("@/lib/storage/IndexedDBAdapter").then(
				(m) => m.db,
			);
			return db.ai_tasks.toArray();
		}
		return [];
	},
};
