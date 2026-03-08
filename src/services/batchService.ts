import { storage, UserTier } from "../lib/storage";
import { OrchestratorConfig, Execution } from "../lib/types";
import { TaskSummary as AiTask } from "./executionTrackingService";
import { topologicalSortStages } from "./stageService";

export interface CreateBatchOptions {
	config: OrchestratorConfig;
	inputItems: Record<string, unknown>[];
	batchName?: string;
	userId?: string;
	launchId?: string;
	tier: UserTier;
	extraMetadata?: Record<string, unknown>;
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
			extraMetadata,
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
		);
		const firstStage = sortedStages[0];

		if (!firstStage) {
			throw new Error("Orchestrator has no stages configured");
		}

		// 2. Snapshot Auxiliary Documents into global_context
		const globalContext: Record<string, string> = {};
		const allAuxIds = new Set<string>();
		config.steps.forEach((s) => {
			if (s.auxiliary_inputs) {
				s.auxiliary_inputs.forEach((id) => allAuxIds.add(id));
			}
		});

		if (allAuxIds.size > 0) {
			console.log(
				`[BatchService] Snapshotting ${allAuxIds.size} auxiliary documents...`,
			);
			for (const id of allAuxIds) {
				try {
					const asset = await adapter.getAsset(id);
					if (asset) {
						const content = await adapter.getAssetContent(asset);
						globalContext[asset.name] = content;
					}
				} catch (err) {
					console.warn(
						`[BatchService] Failed to snapshot asset ${id}:`,
						err,
					);
				}
			}
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

		// 3. Create the batch
		const batch = await adapter.createBatch({
			name:
				batchName || `${config.name} - Launch ${launchId.slice(0, 8)}`,
			status: "processing",
			orchestrator_config_id: config.id,
			created_by: userId || "anonymous",
			global_context: globalContext,
			total_tasks: inputItems.length,
			execution_delay_seconds: config.execution_delay_seconds || 0,
			...({ launch_id: launchId } as Partial<Execution>),
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
							: firstStage.cardinality === "N:1" ||
								  firstStage.cardinality === "many_to_one"
								? "many_to_one"
								: "one_to_one",
					split_path: firstStage.split_path || null,
					split_mode: firstStage.split_mode || "per_item",
					output_mapping: firstStage.output_mapping || "result",
					export_config: firstStage.export_config,
				},
				next_stage_configs: nextStages.map((ns) => ({
					template_id:
						ns.prompt_template_id ||
						`${config.id}_${ns.stage_key || ns.name?.toLowerCase() || ns.id}`,
					cardinality:
						ns.cardinality === "1:N" ||
						ns.cardinality === "one_to_many"
							? "one_to_many"
							: ns.cardinality === "N:1" ||
								  ns.cardinality === "many_to_one"
								? "many_to_one"
								: "one_to_one",
					split_path: ns.split_path || "result.questions",
					split_mode: ns.split_mode || "per_item",
					output_mapping: ns.output_mapping || "result",
					batch_grouping: ns.batch_grouping || null,
					delimiters: ns.contract?.input?.delimiters,
					export_config: ns.export_config,
					dependsOn: ns.dependsOn || [],
				})),
				delimiters: firstStage.contract?.input?.delimiters,
				execution_delay_seconds: config.execution_delay_seconds || 0,
				...extraMetadata,
			},
		}));

		try {
			const createdTasks = await adapter.createTasks(tasksToCreate);

			// 4. Set root_task_id to self for root tasks
			for (const task of createdTasks) {
				await adapter.updateTask(task.id, { root_task_id: task.id });
			}

			return { batch, launchId, tasks: createdTasks };
		} catch (err: unknown) {
			const error = err as Error;
			if (error.message === "QUOTA_EXCEEDED") {
				throw new Error("QUOTA_EXCEEDED");
			}
			throw err;
		}
	},
};
