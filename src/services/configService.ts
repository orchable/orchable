import { storage } from "@/lib/storage";
import { OrchestratorConfig, StepConfig } from "@/lib/types";

export const configService = {
	async saveConfig(config: {
		name: string;
		description?: string;
		steps: StepConfig[];
		viewport?: { x: number; y: number; zoom: number };
		n8n_workflow_id?: string;
		input_mapping?: any;
	}): Promise<OrchestratorConfig> {
		return storage.adapter.saveConfig(config);
	},

	async listConfigs(): Promise<OrchestratorConfig[]> {
		return storage.adapter.listConfigs();
	},

	async getConfig(id: string): Promise<OrchestratorConfig> {
		const config = await storage.adapter.getConfig(id);
		if (!config) {
			throw new Error("Không tìm thấy cấu hình này");
		}
		return config;
	},

	async updateConfig(
		id: string,
		updates: Partial<OrchestratorConfig>,
	): Promise<OrchestratorConfig> {
		return storage.adapter.updateConfig(id, updates);
	},

	async deleteConfig(id: string): Promise<void> {
		return storage.adapter.deleteConfig(id);
	},
};
