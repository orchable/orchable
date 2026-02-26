import { storage, UserTier } from "../lib/storage";
import { OrchestratorConfig } from "../lib/types";
import { TaskSummary as AiTask } from "./executionTrackingService";
import { topologicalSortStages } from "./stageService";

export interface CreateBatchOptions {
	config: OrchestratorConfig;
	inputItems: Record<string, unknown>[];
	batchName?: string;
	userId?: string;
	launchId?: string;
	tier: UserTier;
}

export const batchService = {
	/**
	 * Creates a new execution batch and initializes the root tasks
	 */
	async createLaunch(options: CreateBatchOptions) {
		const {
			config,
			inputItems,
			batchName,
			userId,
			tier,
			launchId: existingLaunchId,
		} = options;

		const { getTierSource } =
			await import("../lib/storage/executionRouter");
		const tierSource = await getTierSource(tier);

		const launchId = existingLaunchId || crypto.randomUUID();
		const adapter = storage.adapter;

		// 1. Get sorted stages
		const sortedStages = topologicalSortStages(
			config.steps as unknown as Parameters<
				typeof topologicalSortStages
			>[0],
			[],
		); // Edges are in steps.dependsOn mostly
		const firstStage = sortedStages[0];

		if (!firstStage) {
			throw new Error("Orchestrator has no stages configured");
		}

		// Identify next stages for the first stage
		const nextStages = config.steps.filter((s) =>
			s.dependsOn?.includes(firstStage.id),
		);
		const nextStageTemplateIds = nextStages.map((ns) => {
			return (
				ns.prompt_template_id ||
				`${config.id}_${ns.stage_key || ns.name?.toLowerCase() || ns.id}`
			);
		});

		// 2. Create the batch
		const batch = await adapter.createBatch({
			name:
				batchName || `${config.name} - Launch ${launchId.slice(0, 8)}`,
			status: "processing",
			orchestrator_config_id: config.id,
			created_by: userId || "anonymous",
			// Store launchId in extra or as a separate field if adapter supports it
			// For Supabase, we have a launch_id column.
			...({ launch_id: launchId } as Record<string, unknown>),
		});

		// 3. Prepare tasks
		const tasksToCreate: Partial<AiTask>[] = inputItems.map((item, i) => ({
			batch_id: batch.id,
			launch_id: launchId,
			stage_key: firstStage.stage_key,
			task_type: firstStage.task_type || "generic",
			tier_source: tierSource,
			step_number: 1,
			status: "plan", // Worker uses 'plan'
			input_data: {
				...item,
				_orchestrator_config_id: config.id,
				_orchestrator_name: config.name,
				_prompt_template_id: firstStage.prompt_template_id,
				_next_stage_template_ids: nextStageTemplateIds,
			},
			lo_code:
				(item as Record<string, string>).lo_code ||
				(item as Record<string, string>).code ||
				null,
			prompt_template_id: firstStage.prompt_template_id,
			user_id: userId || "anonymous",
			sequence: i,
			// Metadata for orchestration
			extra: {
				current_stage_config: {
					template_id: firstStage.prompt_template_id,
					cardinality:
						firstStage.cardinality === "1:N" ||
						firstStage.cardinality === "one_to_many"
							? "one_to_many"
							: "one_to_one",
					split_path: firstStage.split_path || null,
					split_mode: firstStage.split_mode || "per_item",
					output_mapping: firstStage.output_mapping || "result",
				},
				next_stage_configs: nextStages.map((ns) => ({
					template_id:
						ns.prompt_template_id ||
						`${config.id}_${ns.stage_key || ns.name?.toLowerCase() || ns.id}`,
					cardinality:
						ns.cardinality === "1:N" ||
						ns.cardinality === "one_to_many"
							? "one_to_many"
							: "one_to_one",
					split_path: ns.split_path || "result.questions",
					split_mode: ns.split_mode || "per_item",
					output_mapping: ns.output_mapping || "result",
					delimiters: ns.contract?.input?.delimiters,
				})),
				delimiters: firstStage.contract?.input?.delimiters,
			},
		}));

		try {
			const createdTasks = await adapter.createTasks(tasksToCreate);

			// 4. Set root_task_id to self for root tasks
			for (const task of createdTasks) {
				await adapter.updateTask(task.id, { root_task_id: task.id });
			}

			return { batch, launchId, tasks: createdTasks };
		} catch (err: any) {
			if (err.message === "QUOTA_EXCEEDED") {
				throw new Error("QUOTA_EXCEEDED");
			}
			throw err;
		}
	},
};
