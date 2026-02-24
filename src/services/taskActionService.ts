import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";

export const taskActionService = {
	/**
	 * Deletes a batch and all its associated tasks.
	 * Uses the RPC function delete_batch_cascade in Supabase to ensure clean deletion.
	 */
	async deleteBatch(batchId: string): Promise<void> {
		const adapter = storage.adapter;
		if (adapter.constructor.name === "IndexedDBAdapter") {
			await adapter.deleteBatch(batchId);
			return;
		}

		const { error } = await supabase.rpc("delete_batch_cascade", {
			p_batch_id: batchId,
		});

		if (error) {
			console.error("Error deleting batch:", error);
			throw error;
		}
	},

	/**
	 * Retries a single failed task by resetting its status to 'pending'.
	 */
	async retryTask(taskId: string): Promise<void> {
		const adapter = storage.adapter;
		if (adapter.constructor.name === "IndexedDBAdapter") {
			await adapter.updateTask(taskId, {
				status: "plan",
				error_message: null,
			});
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
	 * Retries all failed tasks in a batch.
	 * @returns The number of tasks retried.
	 */
	async retryAllFailedInBatch(batchId: string): Promise<number> {
		const adapter = storage.adapter;
		if (adapter.constructor.name === "IndexedDBAdapter") {
			const tasks = await adapter.listTasks(batchId);
			const failedTasks = tasks.filter((t) => t.status === "failed");
			for (const task of failedTasks) {
				await adapter.updateTask(task.id, {
					status: "plan",
					error_message: null,
				});
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
