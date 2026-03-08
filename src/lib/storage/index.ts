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

/**
 * Returns the storage adapter for non-execution assets (Templates, Components, AI Settings).
 * Assets for all authenticated users (Free & Premium) are stored in Supabase for sync.
 * Unauthenticated users always use local IndexedDB.
 */
export async function getAssetStorageAdapter(): Promise<IStorageAdapter> {
	const { supabase } = await import("../supabase");
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		return getStorageAdapter("supabase-n8n");
	}
	return getStorageAdapter("web-worker");
}

/**
 * Returns the correct storage adapter directly based on a stored type.
 * Specifically used for Documents which can be local even if user is Authenticated (Free tier).
 */
export function getStorageAdapterForType(
	type: "supabase" | "indexeddb",
): IStorageAdapter {
	if (type === "supabase") {
		return new SupabaseAdapter();
	}
	return new IndexedDBAdapter();
}

let currentAdapter: IStorageAdapter = new IndexedDBAdapter();

// Promise that resolves once refreshAdapter has completed at least once.
// Any code that depends on the correct adapter being set should await this.
let adapterReadyResolve: (() => void) | null = null;
const adapterReadyPromise = new Promise<void>((resolve) => {
	adapterReadyResolve = resolve;
});

export const storage = {
	get adapter() {
		return currentAdapter;
	},
	async refreshAdapter(tier: UserTier) {
		const path = await getExecutionPath(tier);
		currentAdapter = getStorageAdapter(path);
		// Signal that adapter is ready
		if (adapterReadyResolve) {
			adapterReadyResolve();
			adapterReadyResolve = null;
		}
		return path;
	},
	/**
	 * Wait for the adapter to be initialized by TierContext.
	 * Call this before using storage.adapter if timing matters.
	 * Resolves immediately if adapter is already initialized.
	 * Has a 3s timeout to avoid infinite blocking when user is not authenticated.
	 */
	async waitForAdapter(): Promise<void> {
		await Promise.race([
			adapterReadyPromise,
			new Promise<void>((resolve) => setTimeout(resolve, 3000)),
		]);
	},
};
