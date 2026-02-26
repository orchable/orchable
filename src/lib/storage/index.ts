import { IStorageAdapter } from "./StorageAdapter";
import { IndexedDBAdapter } from "./IndexedDBAdapter";
import { SupabaseAdapter } from "./SupabaseAdapter";

export type UserTier = "free" | "premium";

export function getStorageAdapter(tier: UserTier): IStorageAdapter {
	// Authenticated users always use Supabase.
	return new SupabaseAdapter();
}

// Default to SupabaseAdapter since all protected routes require authentication.
// SupabaseAdapter methods return empty results for unauthenticated users (via RLS),
// so this is safe even before auth resolves. IndexedDBAdapter is only used
// explicitly for anonymous/offline mode.
let currentAdapter: IStorageAdapter = new SupabaseAdapter();

export const storage = {
	get adapter() {
		return currentAdapter;
	},
	setTier(tier: UserTier) {
		currentAdapter = getStorageAdapter(tier);
	},
};
