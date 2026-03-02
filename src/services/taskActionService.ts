import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";

export const taskActionService = {
	/**
	 * Deletes a batch and all its associated tasks.
	 * Uses the RPC function delete_batch_cascade in Supabase to ensure clean deletion.
	 */
	async deleteBatch(batchOrLaunchId: string): Promise<void> {
		const adapter = storage.adapter;
		if (adapter.constructor.name === "IndexedDBAdapter") {
			const { db } = await import("@/lib/storage/IndexedDBAdapter");
			await db.transaction(
				"rw",
				db.task_batches,
				db.ai_tasks,
				async () => {
					const batches = await db.task_batches
						.where("launch_id")
						.equals(batchOrLaunchId)
						.toArray();
					if (batches.length > 0) {
						for (const b of batches) {
							await db.ai_tasks
								.where("batch_id")
								.equals(b.id)
								.delete();
						}
						const batchIds = batches.map((b) => b.id);
						await db.task_batches.bulkDelete(batchIds);
					} else {
						await db.ai_tasks
							.where("batch_id")
							.equals(batchOrLaunchId)
							.delete();
						await db.task_batches.delete(batchOrLaunchId);
					}
				},
			);
			return;
		}

		// Supabase handles cascade via foreign keys
		const { error } = await supabase
			.from("task_batches")
			.delete()
			.or(`launch_id.eq.${batchOrLaunchId},id.eq.${batchOrLaunchId}`);

		if (error) {
			console.error("Error deleting batch/launch:", error);
			throw error;
		}
	},

	/**
	 * Retries a single failed task by resetting its status to 'pending'.
	 */
	async retryTask(taskId: string): Promise<void> {
		const adapter = storage.adapter;
		if (adapter.constructor.name === "IndexedDBAdapter") {
			const { db } = await import("@/lib/storage/IndexedDBAdapter");
			const task = await db.ai_tasks.get(taskId);

			if (
				task?.batch_id &&
				(task.status === "failed" || task.status === "completed")
			) {
				const batch = await db.task_batches.get(task.batch_id);
				if (batch) {
					const updates: Partial<import("@/lib/types").Execution> = {
						status: "processing",
						updated_at: new Date().toISOString(),
					};
					if (task.status === "failed") {
						updates.failed_tasks = Math.max(
							0,
							(batch.failed_tasks || 0) - 1,
						);
					} else {
						updates.completed_tasks = Math.max(
							0,
							(batch.completed_tasks || 0) - 1,
						);
					}
					await db.task_batches.update(task.batch_id, updates);
				}
			}

			await adapter.updateTask(taskId, {
				status: "plan",
				error_message: null,
			});
			// Cascade: reset downstream children that depend on this task's output
			await this._cascadeResetChildren(taskId);
			return;
		}

		const { error } = await supabase.rpc("retry_failed_task", {
			p_task_id: taskId,
		});
		if (error) {
			console.error("Error retrying task:", error);
			throw error;
		}
	},

	/**
	 * Recursively resets downstream tasks whose parent_task_id matches taskId.
	 * These tasks use the retried task's output as input and must be re-run.
	 */
	async _cascadeResetChildren(taskId: string): Promise<void> {
		const { db } = await import("@/lib/storage/IndexedDBAdapter");
		const children = await db.ai_tasks
			.where("parent_task_id")
			.equals(taskId)
			.toArray();

		for (const child of children) {
			if (child.status === "completed" || child.status === "failed") {
				if (child.batch_id) {
					const batch = await db.task_batches.get(child.batch_id);
					if (batch) {
						const updates: Partial<
							import("@/lib/types").Execution
						> = {};
						if (child.status === "failed") {
							updates.failed_tasks = Math.max(
								0,
								(batch.failed_tasks || 0) - 1,
							);
						} else {
							updates.completed_tasks = Math.max(
								0,
								(batch.completed_tasks || 0) - 1,
							);
						}
						await db.task_batches.update(child.batch_id, updates);
					}
				}

				await db.ai_tasks.update(child.id, {
					status: "plan",
					error_message: null,
					output_data: null,
					started_at: null,
					completed_at: null,
				});
				// Recurse to grandchildren
				await this._cascadeResetChildren(child.id);
			}
		}
	},

	/**
	 * Retries all failed tasks in a batch.
	 * @returns The number of tasks retried.
	 */
	async retryAllFailedInBatch(batchId: string): Promise<number> {
		const adapter = storage.adapter;
		if (adapter.constructor.name === "IndexedDBAdapter") {
			const { db } = await import("@/lib/storage/IndexedDBAdapter");
			const tasks = await adapter.listTasks(batchId);
			const failedTasks = tasks.filter((t) => t.status === "failed");

			if (failedTasks.length > 0) {
				const batch = await db.task_batches.get(batchId);
				if (batch) {
					await db.task_batches.update(batchId, {
						status: "processing",
						failed_tasks: Math.max(
							0,
							(batch.failed_tasks || 0) - failedTasks.length,
						),
						updated_at: new Date().toISOString(),
					});
				}

				for (const task of failedTasks) {
					await adapter.updateTask(task.id, {
						status: "plan",
						error_message: null,
					});
					await this._cascadeResetChildren(task.id);
				}
			}
			return failedTasks.length;
		}

		const { data, error } = await supabase.rpc(
			"retry_all_failed_in_batch",
			{ p_batch_id: batchId },
		);
		if (error) {
			console.error("Error retrying all failed tasks in batch:", error);
			throw error;
		}
		return data as number;
	},
};
