import { IStorageAdapter } from "./StorageAdapter";
import { IndexedDBAdapter } from "./IndexedDBAdapter";
import { SupabaseAdapter } from "./SupabaseAdapter";

export type UserTier = "free" | "premium";

export function getStorageAdapter(tier: UserTier): IStorageAdapter {
	// In the new system, we always use Supabase for authenticated users.
	// We keep IndexedDBAdapter only for temporary caching or offline-first sync.
	return new SupabaseAdapter();
}

// Global instance for singleton use (will be updated when tier changes)
let currentAdapter: IStorageAdapter = new IndexedDBAdapter();

export const storage = {
	get adapter() {
		return currentAdapter;
	},
	setTier(tier: UserTier) {
		currentAdapter = getStorageAdapter(tier);
	},
};
