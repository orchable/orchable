import { db } from "../lib/storage/IndexedDBAdapter";
import { SupabaseAdapter } from "../lib/storage/SupabaseAdapter";
import { UserTier } from "../lib/storage";

const cloudAdapter = new SupabaseAdapter();

export const syncService = {
	/**
	 * Pushes local batches and tasks to Supabase using UPSERT (not INSERT).
	 * Each item is synced independently so one failure doesn't abort the rest.
	 */
	async syncToCloud(
		options: { skipTasks?: boolean; clearAfterSync?: boolean } = {},
	) {
		console.log("[SyncService] Starting sync to cloud...", options);

		// 1. Sync batches + their tasks
		if (!options.skipTasks) {
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

					// 1.1 Clear local data if requested (to avoid zombie tasks and loop)
					if (options.clearAfterSync) {
						await db.ai_tasks
							.where("batch_id")
							.equals(batch.id)
							.delete();
						await db.task_batches.delete(batch.id);
						console.log(
							`[SyncService] Cleared local data for batch ${batch.id}`,
						);
					}
				} catch (err) {
					console.warn(
						`[SyncService] Failed to sync batch ${batch.id}:`,
						err,
					);
				}
			}
		} else {
			console.log(
				"[SyncService] Skipping tasks/batches sync (running in web-worker mode)",
			);
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
	async migrateAnonymousData(tier: UserTier) {
		const { getExecutionPath } =
			await import("../lib/storage/executionRouter");
		const path = await getExecutionPath(tier);
		// BYOK users run locally — don't push their tasks to Supabase.
		// We clear after sync to avoid the "vicious loop" where data is pushed again on next login.
		await this.syncToCloud({
			skipTasks: path === "web-worker",
			clearAfterSync: true,
		});
	},
};
