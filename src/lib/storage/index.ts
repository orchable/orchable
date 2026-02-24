import { IStorageAdapter } from "./StorageAdapter";
import { IndexedDBAdapter } from "./IndexedDBAdapter";
import { SupabaseAdapter } from "./SupabaseAdapter";

export type UserTier =
	| "anonymous"
	| "free"
	| "premium_byok"
	| "premium_managed";

export function getStorageAdapter(tier: UserTier): IStorageAdapter {
	if (tier === "anonymous" || tier === "free") {
		return new IndexedDBAdapter();
	}
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
