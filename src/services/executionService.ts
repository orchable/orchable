import { storage, UserTier } from "@/lib/storage";
import {
	Execution,
	StepExecution,
	SyllabusRow,
	ExecutionStatus,
} from "@/lib/types";
import { batchService } from "./batchService";

export const executionService = {
	async createExecution(data: {
		configId: string;
		syllabusRow: SyllabusRow;
		tier: UserTier;
		launchId?: string;
	}): Promise<Execution> {
		const { configId, syllabusRow, tier, launchId } = data;
		const configs = await storage.adapter.listConfigs();
		const config = configs?.find((c) => c.id === configId);
		if (!config) throw new Error("Config not found");

		const { batch } = await batchService.createLaunch({
			config,
			inputItems: [syllabusRow as unknown as Record<string, unknown>],
			batchName: syllabusRow.lessonTitle || "Untitled Execution",
			tier,
			launchId,
		});

		return batch as unknown as Execution;
	},

	async listExecutions(): Promise<Execution[]> {
		await storage.waitForAdapter();
		const adapter = storage.adapter;
		let results: Execution[] = [];

		if (adapter.constructor.name === "IndexedDBAdapter") {
			results = (await adapter.listBatches()) as unknown as Execution[];
		} else {
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
				results = (data || []) as unknown as Execution[];
			}

			// Always fetch local batches implicitly (since web-worker tasks live here pre-sync)
			const { db } = await import("../lib/storage/IndexedDBAdapter");
			const localBatches =
				(await db.task_batches.toArray()) as unknown as Execution[];

			// De-duplicate using Map
			const batchMap = new Map<string, Execution>();
			results.forEach((b) => batchMap.set(b.id, b));
			localBatches.forEach((b) => batchMap.set(b.id, b));

			results = Array.from(batchMap.values())
				.sort(
					(a, b) =>
						new Date(b.created_at).getTime() -
						new Date(a.created_at).getTime(),
				)
				.slice(0, 40);
		}

		return results;
	},

	async getExecution(id: string): Promise<Execution> {
		const { db } = await import("../lib/storage/IndexedDBAdapter");
		let batch = await db.task_batches.get(id);

		if (!batch) {
			batch = (await storage.adapter.getBatch(
				id,
			)) as unknown as Execution;
		}

		if (!batch) throw new Error("Execution not found");
		return batch as unknown as Execution;
	},

	async updateExecutionStatus(
		id: string,
		status: Execution["status"],
		additionalData?: Partial<Execution>,
	): Promise<void> {
		const { db } = await import("../lib/storage/IndexedDBAdapter");
		const localBatch = await db.task_batches.get(id);

		if (localBatch) {
			await db.task_batches.update(id, {
				status: status as ExecutionStatus,
				...additionalData,
				updated_at: new Date().toISOString(),
			});
		} else {
			await storage.adapter.updateBatch(id, {
				status: status as ExecutionStatus,
				...additionalData,
			});
		}
	},

	async getStepExecutions(executionId: string) {
		const { db } = await import("../lib/storage/IndexedDBAdapter");
		let tasks = await db.ai_tasks
			.where("batch_id")
			.equals(executionId)
			.toArray();

		if (tasks.length === 0) {
			tasks = (await storage.adapter.listTasks(
				executionId,
			)) as unknown as import("./executionTrackingService").TaskSummary[];
		}

		return tasks.map((t: unknown) => {
			const task = t as import("./executionTrackingService").TaskSummary;
			return {
				id: task.id,
				execution_id: task.batch_id,
				step_id: task.stage_key,
				step_name: task.stage_key,
				status: task.status as string,
				retry_count: 0,
				max_retries: 3,
				created_at: task.created_at || new Date().toISOString(),
				updated_at: task.updated_at || new Date().toISOString(),
				result: task.output_data
					? { summary: JSON.stringify(task.output_data) }
					: undefined,
				error_message: task.error_message,
			};
		}) as StepExecution[];
	},

	async listAiTasks(): Promise<unknown[]> {
		await storage.waitForAdapter();
		const adapter = storage.adapter;
		let results: unknown[] = [];

		if (adapter.constructor.name === "IndexedDBAdapter") {
			const db = await import("@/lib/storage/IndexedDBAdapter").then(
				(m) => m.db,
			);
			results = await db.ai_tasks.toArray();
		} else {
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
				results = data || [];
			}

			// Always fetch local tasks implicitly (since web-worker tasks live here pre-sync)
			const db = await import("@/lib/storage/IndexedDBAdapter").then(
				(m) => m.db,
			);
			const localTasks = (await db.ai_tasks.toArray()) as unknown[];

			// De-duplicate using Map
			type TaskRecord = {
				id: string;
				created_at: string;
				[key: string]: unknown;
			};
			const taskMap = new Map<string, TaskRecord>();

			(results as TaskRecord[]).forEach((t) => taskMap.set(t.id, t));
			(localTasks as TaskRecord[]).forEach((t) => taskMap.set(t.id, t));

			results = Array.from(taskMap.values())
				.sort(
					(a, b) =>
						new Date(b.created_at).getTime() -
						new Date(a.created_at).getTime(),
				)
				.slice(0, 100);
		}

		return results;
	},
};
