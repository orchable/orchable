import { supabase } from "@/lib/supabase";
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
		const {
			data: { user },
		} = await supabase.auth.getUser();

		const { data, error } = await supabase
			.from("lab_orchestrator_configs")
			.insert({
				name: config.name,
				description: config.description,
				steps: config.steps,
				viewport: config.viewport, // Save viewport
				n8n_workflow_id: config.n8n_workflow_id,
				input_mapping: config.input_mapping,
				created_by: user?.id,
			})
			.select()
			.single();

		if (error) throw error;
		return data;
	},

	async listConfigs(): Promise<OrchestratorConfig[]> {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		// If not logged in, return an empty array instead of fetching all configs
		if (!user) {
			return [];
		}

		const query = supabase
			.from("lab_orchestrator_configs")
			.select("*")
			.eq("created_by", user.id)
			.order("created_at", { ascending: false });

		const { data, error } = await query;

		if (error) throw error;
		return data;
	},

	async getConfig(id: string): Promise<OrchestratorConfig> {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		// If not logged in, don't allow fetching config from DB
		if (!user) {
			throw new Error("Bạn cần đăng nhập để xem cấu hình này");
		}

		const query = supabase
			.from("lab_orchestrator_configs")
			.select("*")
			.eq("id", id)
			.eq("created_by", user.id);

		const { data, error } = await query.single();

		if (error) throw error;
		return data;
	},

	async updateConfig(
		id: string,
		updates: Partial<OrchestratorConfig>,
	): Promise<OrchestratorConfig> {
		const { data, error } = await supabase
			.from("lab_orchestrator_configs")
			.update({
				...updates,
				updated_at: new Date().toISOString(),
			})
			.eq("id", id)
			.select()
			.single();

		if (error) throw error;
		return data;
	},

	async deleteConfig(id: string): Promise<void> {
		const { error } = await supabase
			.from("lab_orchestrator_configs")
			.delete()
			.eq("id", id);

		if (error) throw error;
	},
};
