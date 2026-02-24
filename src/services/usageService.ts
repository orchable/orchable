import { db } from "@/lib/storage/IndexedDBAdapter";

export interface UsageData {
	count: number;
	month: string;
}

export const usageService = {
	async getUsage(): Promise<UsageData> {
		const currentMonth = new Date().toISOString().slice(0, 7);
		const data = await db.metadata.get("usage");

		if (data && data.value.month === currentMonth) {
			return data.value;
		}

		const newData = { count: 0, month: currentMonth };
		await this.saveUsage(newData);
		return newData;
	},

	async saveUsage(data: UsageData) {
		await db.metadata.put({ key: "usage", value: data });
	},

	async incrementUsage(amount: number = 1): Promise<UsageData> {
		const data = await db.incrementMetadata("usage", amount);
		return data;
	},

	getLimit(tier: string): number {
		switch (tier) {
			case "anonymous":
				return 50;
			case "free":
				return 200;
			default:
				return Infinity;
		}
	},

	async hasRemainingTasks(tier: string): Promise<boolean> {
		const usage = await this.getUsage();
		const limit = this.getLimit(tier);
		return usage.count < limit;
	},
};
