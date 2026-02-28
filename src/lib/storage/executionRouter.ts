import { UserTier } from ".";
import { keyPoolService } from "../../services/keyPoolService";

export type ExecutionPath = "web-worker" | "supabase-n8n";

export async function getExecutionPath(tier: UserTier): Promise<ExecutionPath> {
	if (tier === "free") {
		const hasKeys = await keyPoolService.hasPersonalKeys(tier);
		if (hasKeys) {
			return "web-worker";
		}
	}
	return "supabase-n8n";
}

export type TierSource =
	| "free_pool"
	| "free_byok"
	| "premium_pool"
	| "premium_byok";

export async function getTierSource(tier: UserTier): Promise<TierSource> {
	const hasKeys = await keyPoolService.hasPersonalKeys(tier);
	if (tier === "premium") {
		return hasKeys ? "premium_byok" : "premium_pool";
	}
	if (tier === "free") {
		return hasKeys ? "free_byok" : "free_pool";
	}
	// Safety fallback (should never happen if types are respected, but helps avoid silent misclassification)
	console.warn(
		`[getTierSource] Unknown tier received: ${tier}. Defaulting to free.`,
	);
	return hasKeys ? "free_byok" : "free_pool";
}
