import { supabase } from "@/lib/supabase";

export interface UsageData {
	count: number;
	month: string;
}

export const usageService = {
	async getUsage(): Promise<UsageData> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user)
			return { count: 0, month: new Date().toISOString().slice(0, 7) };

		const { data, error } = await supabase.rpc("get_user_usage", {
			p_user_id: user.id,
		});

		if (error) {
			console.error("Error fetching usage:", error);
			return { count: 0, month: new Date().toISOString().slice(0, 7) };
		}

		// RPC returns a single row for current month
		if (data && data.length > 0) {
			return {
				count: data[0].task_count,
				month: data[0].month,
			};
		}

		return { count: 0, month: new Date().toISOString().slice(0, 7) };
	},

	async incrementUsage(
		tasks: number = 1,
		inputTokens: number = 0,
		outputTokens: number = 0,
	): Promise<void> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		const { error } = await supabase.rpc("increment_user_usage", {
			p_user_id: user.id,
			p_tasks: tasks,
			p_input_tokens: inputTokens,
			p_output_tokens: outputTokens,
		});

		if (error) {
			console.error("Error incrementing usage:", error);
		}
	},

	getLimit(tier: string): number {
		switch (tier) {
			case "free":
				return 100;
			case "premium":
				return Infinity;
			default:
				return 0; // Anonymous (if somehow bypassed) gets nothing
		}
	},

	async hasRemainingTasks(tier: string): Promise<boolean> {
		const usage = await this.getUsage();
		const limit = this.getLimit(tier);

		// 10% Grace Period Decision 6
		const graceFactor = 1.1;
		const hardLimit =
			tier === "premium" ? Infinity : Math.floor(limit * graceFactor);

		return usage.count < hardLimit;
	},
};
