import { supabase } from "@/lib/supabase";
import { TaskSummary as AiTask } from "./executionTrackingService";

export interface QuotaResponse {
	success: boolean;
	error?:
		| "QUOTA_EXCEEDED"
		| "UNAUTHENTICATED"
		| "UNKNOWN"
		| "QUOTA_FETCH_FAILED";
	used?: number;
	limit?: number;
	remaining?: number;
}

export interface UsageResponse {
	used: number;
	limit: number;
	remaining: number;
}

export const freeTierService = {
	async submitTasks(tasks: Partial<AiTask>[]): Promise<QuotaResponse> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "UNAUTHENTICATED" };

		try {
			const { data, error } = await supabase.rpc(
				"submit_free_tier_tasks",
				{
					p_tasks: tasks,
				},
			);

			if (error) {
				console.error("[FreeTierService] RPC error:", error);
				return { success: false, error: "UNKNOWN" };
			}

			return data as QuotaResponse;
		} catch (err) {
			console.error("[FreeTierService] Submission failed:", err);
			return { success: false, error: "UNKNOWN" };
		}
	},

	async getUsage(): Promise<UsageResponse> {
		try {
			const { data, error } = await supabase.rpc("get_free_tier_usage");
			if (error) {
				console.error("[FreeTierService] Usage fetch failed:", error);
				return { used: 0, limit: 30, remaining: 0 };
			}
			// RPC returns a row or array depending on postgres function definition
			// get_free_tier_usage returns a table (one row)
			const row = Array.isArray(data) ? data[0] : data;
			return {
				used: row?.used || 0,
				limit: row?.limit || 30,
				remaining: row?.remaining || 0,
			};
		} catch (err) {
			console.error("[FreeTierService] getUsage failed:", err);
			return { used: 0, limit: 30, remaining: 0 };
		}
	},

	async syncCompletedTasks(): Promise<{ synced: number }> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { synced: 0 };

		try {
			// 1. Fetch completed, unsynced tasks for this user
			const { data: unsyncedTasks, error } = await supabase
				.from("ai_tasks")
				.select("*")
				.eq("user_id", user.id)
				.eq("status", "completed")
				.eq("synced_to_client", false);

			if (error || !unsyncedTasks || unsyncedTasks.length === 0) {
				return { synced: 0 };
			}

			// 2. Save to local storage (IndexedDB)
			const db = await import("../lib/storage/IndexedDBAdapter").then(
				(m) => m.db,
			);
			await db.ai_tasks.bulkPut(unsyncedTasks);

			// 3. Mark as synced on Supabase
			const taskIds = unsyncedTasks.map((t) => t.id);
			await supabase
				.from("ai_tasks")
				.update({ synced_to_client: true })
				.in("id", taskIds);

			console.log(
				`[FreeTierService] Synced ${unsyncedTasks.length} tasks to local storage`,
			);
			return { synced: unsyncedTasks.length };
		} catch (err) {
			console.error("[FreeTierService] syncCompletedTasks failed:", err);
			return { synced: 0 };
		}
	},
};
