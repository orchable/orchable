import { db } from "../lib/storage/IndexedDBAdapter";
import { SupabaseAdapter } from "../lib/storage/SupabaseAdapter";
import { Execution as TaskBatch } from "../lib/types";
import { TaskSummary as AiTask } from "../services/executionTrackingService";

const cloudAdapter = new SupabaseAdapter();

export const syncService = {
	/**
	 * Pushes local batches and tasks to Supabase.
	 * Only works if the user is authenticated (handled by SupabaseAdapter).
	 */
	async syncToCloud() {
		console.log("[SyncService] Starting sync to cloud...");

		try {
			// 1. Get all local batches
			const localBatches = await db.task_batches.toArray();

			for (const batch of localBatches) {
				// Upsert batch to cloud
				await cloudAdapter.upsertBatch(batch);

				// 2. Get all tasks for this batch
				const tasks = await db.ai_tasks
					.where("batch_id")
					.equals(batch.id)
					.toArray();
				if (tasks.length > 0) {
					await cloudAdapter.upsertTasks(tasks);
				}

				console.log(
					`[SyncService] Synced batch ${batch.id} with ${tasks.length} tasks`,
				);
			}

			console.log("[SyncService] Sync completed.");
		} catch (error) {
			console.error("[SyncService] Sync failed:", error);
			throw error;
		}
	},

	/**
	 * Migration logic: called after first login to move anonymous data to user's account.
	 */
	async migrateAnonymousData() {
		// In Phase 2, we just trigger a full sync
		await this.syncToCloud();
	},
};
