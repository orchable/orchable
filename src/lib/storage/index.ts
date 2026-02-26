import { IStorageAdapter } from "./StorageAdapter";
import { IndexedDBAdapter } from "./IndexedDBAdapter";
import { SupabaseAdapter } from "./SupabaseAdapter";
import { getExecutionPath } from "./executionRouter";

export type UserTier = "free" | "premium";

export function getStorageAdapter(
	path: "web-worker" | "supabase-n8n",
): IStorageAdapter {
	if (path === "supabase-n8n") {
		return new SupabaseAdapter();
	}
	return new IndexedDBAdapter();
}

let currentAdapter: IStorageAdapter = new IndexedDBAdapter();

export const storage = {
	get adapter() {
		return currentAdapter;
	},
	async refreshAdapter(tier: UserTier) {
		const path = await getExecutionPath(tier);
		currentAdapter = getStorageAdapter(path);
		return path;
	},
};
