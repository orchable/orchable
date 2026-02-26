import { db } from "../lib/storage/IndexedDBAdapter";
import { SupabaseAdapter } from "../lib/storage/SupabaseAdapter";

const cloudAdapter = new SupabaseAdapter();

export const syncService = {
	/**
	 * Pushes local batches and tasks to Supabase using UPSERT (not INSERT).
	 * Each item is synced independently so one failure doesn't abort the rest.
	 */
	async syncToCloud() {
		console.log("[SyncService] Starting sync to cloud...");

		// 1. Sync batches + their tasks
		const localBatches = await db.task_batches.toArray();
		for (const batch of localBatches) {
			try {
				await cloudAdapter.upsertBatch(batch);

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
			} catch (err) {
				console.warn(
					`[SyncService] Failed to sync batch ${batch.id}:`,
					err,
				);
			}
		}

		// 2. Sync configs — use UPSERT to avoid unique constraint violations
		const localConfigs = await db.orchestrator_configs.toArray();
		for (const config of localConfigs) {
			try {
				await cloudAdapter.upsertConfig(config);
				console.log(`[SyncService] Synced config ${config.id}`);
			} catch (err) {
				console.warn(
					`[SyncService] Failed to sync config ${config.id}:`,
					err,
				);
			}
		}

		console.log("[SyncService] Sync completed.");
	},

	/**
	 * Migration logic: called after first login to move anonymous data to user's account.
	 */
	async migrateAnonymousData() {
		await this.syncToCloud();
	},
};
