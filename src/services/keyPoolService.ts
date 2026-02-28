import { supabase } from "@/lib/supabase";
import { UserTier } from "@/lib/storage";
import { db } from "@/lib/storage/IndexedDBAdapter";

export interface KeyConfig {
	type: "personal" | "pool";
	apiKey?: string;
	webhookUrl?: string;
	poolType?: "free_pool" | "premium_pool";
}

export const keyPoolService = {
	async resolveKeys(tier: UserTier): Promise<KeyConfig[]> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Authentication required to resolve keys.");

		// 1. Fetch personal keys based on tier
		let personalKeys: { api_key_encrypted: string }[] = [];

		if (tier === "free") {
			// Fetch from local IndexedDB
			const localKeys = await db.user_api_keys
				.where("pool_type")
				.equals("personal")
				.toArray();
			personalKeys = localKeys.map((k) => ({
				api_key_encrypted: k.api_key_encrypted,
			}));
		} else {
			// Premium: Fetch from Supabase
			const { data, error } = await supabase
				.from("user_api_keys")
				.select("*")
				.eq("user_id", user.id)
				.eq("pool_type", "personal");

			if (error) {
				console.error(
					"Error fetching personal keys from Supabase:",
					error,
				);
			} else {
				personalKeys = data || [];
			}
		}

		// 2. If user has personal keys, return them (with tier-based limits)
		if (personalKeys && personalKeys.length > 0) {
			const limit = tier === "premium" ? Infinity : 3;
			return personalKeys.slice(0, limit).map((k) => ({
				type: "personal",
				apiKey: k.api_key_encrypted,
			}));
		}

		// 3. Fallback to platform managed pools via webhook
		// These URLs would typically come from environment variables or a global config table
		const hubBaseUrl =
			import.meta.env.VITE_N8N_HUB_URL ||
			"https://n8n.lovable.dev/webhook/rotation-manager";

		return [
			{
				type: "pool",
				webhookUrl: `${hubBaseUrl}?pool=${tier === "premium" ? "premium_pool" : "free_pool"}`,
				poolType: tier === "premium" ? "premium_pool" : "free_pool",
			},
		];
	},

	async hasPersonalKeys(tier?: UserTier): Promise<boolean> {
		if (tier === "free") {
			const count = await db.user_api_keys
				.where("pool_type")
				.equals("personal")
				.count();
			return count > 0;
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return false;

		const { data, error } = await supabase
			.from("user_api_keys")
			.select("id")
			.eq("user_id", user.id)
			.eq("pool_type", "personal")
			.limit(1);

		if (error) return false;
		return data && data.length > 0;
	},
};
