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
