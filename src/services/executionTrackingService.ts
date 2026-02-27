import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Types
export interface StageProgress {
	stage_key: string;
	stage_number: number;
	total_tasks: number;
	completed_tasks: number;
	pending_tasks: number;
	running_tasks: number;
	failed_tasks: number;
	progress_percentage: number;
}

export interface ExecutionProgress {
	orchestrator_execution_id: string;
	orchestrator_name: string;
	batch_name?: string | null;
	config_name?: string | null;
	status: string;
	started_at: string | null;
	completed_at: string | null;
	total_stages: number;
	current_stage: number;
	overall_progress: number;
	stages: StageProgress[];
}

import { StepConfig } from "@/lib/types";

export interface TaskSummary {
	id: string;
	batch_id?: string | null;
	stage_key: string;
	stage_number?: number;
	step_number?: number | null;
	task_type?: string | null;
	status: string;
	lo_code?: string | null;
	created_at: string;
	updated_at?: string | null;
	started_at?: string | null;
	completed_at?: string | null;
	error_message?: string | null;
	user_id?: string | null;
	parent_task_id?: string | null;
	root_task_id?: string | null;
	hierarchy_path?: string[];
	input_data?: Record<string, unknown> | null;
	output_data?: Record<string, unknown> | null;
	prompt_template_id?: string | null;

	// Parity with ai_tasks table
	n8n_execution_id?: string | null;
	orchestrator_tracking?: Record<string, unknown> | null;
	agent_id?: string | null;
	batch_priority?: string | null;
	test_mode?: boolean;
	sequence?: number | null;
	phase_code?: string | null;
	retry_count?: number;
	step_id?: string | null;
	total_steps?: number | null;
	next_task_config?: Record<string, unknown> | null;
	orchestrator_execution_id?: string | null;
	step_execution_id?: string | null;
	requires_approval?: boolean;
	approved_at?: string | null;
	approved_by?: string | null;
	edited_output_data?: Record<string, unknown> | null;
	edit_notes?: string | null;
	extra?: Record<string, unknown> | null;
	split_group_id?: string | null;
	launch_id?: string | null;
	tier_source?:
		| "free_pool"
		| "free_byok"
		| "premium_pool"
		| "premium_byok"
		| null;
	synced_to_client?: boolean;
}

/**
 * Safe JSON parse that handles both objects and nested stringified JSON
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseSafe = (val: any): any => {
	if (!val) return null;
	if (typeof val === "object") return val;
	try {
		let parsed = JSON.parse(val);
		// Handle double-stringified case (common in current n8n setup)
		if (typeof parsed === "string") {
			try {
				parsed = JSON.parse(parsed);
			} catch (e) {
				// Return as string if it's not actually double-JSON
			}
		}
		return parsed;
	} catch (e) {
		return val;
	}
};

/**
 * Get execution progress with stage breakdown
 * Now queries by batch_id instead of orchestrator_execution_id
 */
export async function getExecutionProgress(
	id: string,
): Promise<ExecutionProgress | null> {
	const { storage } = await import("@/lib/storage");
	await storage.waitForAdapter();
	const adapter = storage.adapter;
	const isIndexedDB = adapter.constructor.name === "IndexedDBAdapter";

	let batchData: Record<string, unknown> | null = null;
	let orchestratorConfig: {
		name: string;
		steps: StepConfig[];
	} | null = null;
	let safeTasks: TaskSummary[] = [];

	if (isIndexedDB) {
		const { db } = await import("@/lib/storage/IndexedDBAdapter");
		// 1. Get batch info
		const batch = await db.task_batches.get(id);
		batchData =
			batch ||
			(await db.task_batches.where("launch_id").equals(id).first());

		if (batchData && batchData.orchestrator_config_id) {
			orchestratorConfig = await db.orchestrator_configs.get(
				batchData.orchestrator_config_id,
			);
		}

		// 2. Get tasks
		const rawTasks = await db.ai_tasks
			.where("batch_id")
			.equals(id)
			.or("launch_id")
			.equals(id)
			.toArray();

		safeTasks = rawTasks.map((t) => ({
			...(t as unknown as TaskSummary),
			input_data: parseSafe(t.input_data) as Record<string, unknown>,
		}));
	} else {
		// 1. Get batch info AND join with orchestration config to get expected stages
		let { data: bb, error: batchError } = await supabase
			.from("task_batches")
			.select(
				`
				name, 
				status, 
				orchestrator_config_id,
				lab_orchestrator_configs!task_batches_orchestrator_config_id_fkey (
					name,
					steps
				)
			`,
			)
			.eq("id", id)
			.maybeSingle();

		// If not found by batch id, try as a launch_id (campaign navigation)
		if (!bb && !batchError) {
			const { data: launchBatch, error: launchErr } = await supabase
				.from("task_batches")
				.select(
					`
				name, 
				status, 
				orchestrator_config_id,
				lab_orchestrator_configs!task_batches_orchestrator_config_id_fkey (
					name,
					steps
				)
			`,
				)
				.eq("launch_id", id)
				.order("created_at", { ascending: true })
				.limit(1)
				.maybeSingle();
			if (!launchErr && launchBatch) {
				bb = launchBatch;
			}
		}

		if (batchError) {
			console.error("Failed to fetch batch info:", batchError);
		}

		batchData = bb as Record<string, unknown>;
		const configData = (batchData as Record<string, unknown>)
			?.lab_orchestrator_configs as Record<string, unknown> | null;
		if (configData) {
			orchestratorConfig = {
				name: configData.name as string,
				steps: (configData.steps as unknown as StepConfig[]) || [],
			};
		}

		// 2. Get all tasks for this batch OR launch (campaign)
		const { data: tasks, error: tasksError } = await supabase
			.from("ai_tasks")
			.select(
				"id, stage_key, step_number, status, created_at, started_at, completed_at, input_data",
			)
			.or(`batch_id.eq.${id},launch_id.eq.${id}`);

		if (tasksError) {
			console.error("Failed to fetch tasks:", tasksError);
			return null;
		}

		// Apply parseSafe to all tasks data
		safeTasks = (tasks || []).map((t) => ({
			...(t as unknown as TaskSummary),
			input_data: parseSafe(t.input_data) as Record<string, unknown>,
		}));
	}

	if (!safeTasks || safeTasks.length === 0) {
		// If batch exists but no tasks yet, it's pending
		if (batchData) {
			return {
				orchestrator_execution_id: id,
				orchestrator_name:
					orchestratorConfig?.name || "Initializing...",
				batch_name: batchData.name as string,
				status: (batchData.status as string) || "pending",
				started_at: null,
				completed_at: null,
				total_stages: 0,
				current_stage: 0,
				overall_progress: 0,
				stages: [],
			};
		}
		return null;
	}

	// Extract orchestrator info from multiple sources with fallbacks
	// Prioritize the Batch Name (which could be the User's Alias or the auto-generated launch name)
	const firstTask = safeTasks[0];
	const orchestratorNameFromTask = (
		firstTask.input_data as Record<string, unknown> | null
	)?._orchestrator_name;
	const orchestratorName =
		batchData?.name ||
		orchestratorConfig?.name ||
		orchestratorNameFromTask ||
		"Orchestrator";

	// 3. Determine status from tasks (Calculate actual current state)
	const hasRunning = safeTasks.some(
		(t) => t.status === "processing" || t.status === "running",
	);
	const hasFailed = safeTasks.some((t) => t.status === "failed");
	const allCompleted = safeTasks.every((t) => t.status === "completed");

	let calculatedStatus = "running";
	if (allCompleted) calculatedStatus = "completed";
	else if (hasFailed) calculatedStatus = "failed";
	else if (hasRunning) calculatedStatus = "processing";

	// EDGE CASE: Stuck Workflow Detection
	// The `steps` column in lab_orchestrator_configs is a JSONB array of stage configs.
	// If all tasks completed but fewer stages have tasks than expected, the workflow is stuck.
	const expectedSteps = orchestratorConfig?.steps || [];
	const actualStageKeys = new Set(safeTasks.map((t) => t.stage_key));
	const isStuck =
		allCompleted &&
		expectedSteps.length > 0 &&
		actualStageKeys.size < expectedSteps.length;

	if (isStuck) {
		calculatedStatus = "failed"; // Mark as failed if stages are missing
	}

	// Use calculated status, but respect terminal manual states if set in batchData
	const finalStatus =
		batchData?.status === "completed" || batchData?.status === "failed"
			? batchData.status
			: isStuck
				? "failed"
				: calculatedStatus;

	// Find earliest and latest timestamps
	const startedAt = safeTasks.reduce(
		(min, t) => {
			const d = t.created_at;
			return !min || d < min ? d : min;
		},
		null as string | null,
	);

	const completedAt =
		allCompleted && !isStuck
			? safeTasks.reduce(
					(max, t) => {
						const d = t.completed_at;
						return !max || (d && d > max) ? d : max;
					},
					null as string | null,
				)
			: null;

	// Group by stage
	const stageMap = new Map<
		string,
		{
			stage_key: string;
			stage_number: number;
			tasks: typeof safeTasks;
		}
	>();

	safeTasks.forEach((task) => {
		const key = task.stage_key || `stage_${task.step_number || 1}`;
		if (!stageMap.has(key)) {
			stageMap.set(key, {
				stage_key: key,
				stage_number: task.step_number || 1,
				tasks: [],
			});
		}
		stageMap.get(key)!.tasks.push(task);
	});

	// Calculate per-stage progress
	const stages: StageProgress[] = [];
	let totalCompleted = 0;
	let totalTasks = 0;

	stageMap.forEach(({ stage_key, stage_number, tasks: stageTasks }) => {
		const completed = stageTasks.filter(
			(t) => t.status === "completed",
		).length;
		const pending = stageTasks.filter(
			(t) => t.status === "plan" || t.status === "pending",
		).length;
		const running = stageTasks.filter(
			(t) => t.status === "processing" || t.status === "running",
		).length;
		const failed = stageTasks.filter((t) => t.status === "failed").length;
		const total = stageTasks.length;

		stages.push({
			stage_key,
			stage_number,
			total_tasks: total,
			completed_tasks: completed,
			pending_tasks: pending,
			running_tasks: running,
			failed_tasks: failed,
			progress_percentage:
				total > 0 ? Math.round((completed / total) * 100) : 0,
		});

		totalCompleted += completed;
		totalTasks += total;
	});

	// Sort by stage number
	stages.sort((a, b) => a.stage_number - b.stage_number);

	return {
		orchestrator_execution_id: id,
		orchestrator_name: orchestratorName,
		batch_name: batchData?.name,
		config_name: orchestratorConfig?.name,
		status: finalStatus,
		started_at: startedAt,
		completed_at: completedAt,
		total_stages: stages.length,
		current_stage: stages.filter((s) => s.completed_tasks > 0).length,
		overall_progress:
			totalTasks > 0
				? Math.round((totalCompleted / totalTasks) * 100)
				: 0,
		stages,
	};
}

/**
 * Get task list for an execution/batch with optional stage filter
 */
export async function getExecutionTasks(
	id: string,
	stageKey?: string,
): Promise<TaskSummary[]> {
	const { storage } = await import("@/lib/storage");
	await storage.waitForAdapter();
	const adapter = storage.adapter;
	const isIndexedDB = adapter.constructor.name === "IndexedDBAdapter";

	let rawTasks: Partial<TaskSummary>[] = [];

	if (isIndexedDB) {
		const { db } = await import("@/lib/storage/IndexedDBAdapter");
		let tasks = await db.ai_tasks
			.where("batch_id")
			.equals(id)
			.or("launch_id")
			.equals(id)
			.toArray();

		if (stageKey) {
			tasks = tasks.filter((t) => t.stage_key === stageKey);
		}

		tasks.sort((a, b) => {
			if ((a.step_number || 0) !== (b.step_number || 0)) {
				return (a.step_number || 0) - (b.step_number || 0);
			}
			return (
				new Date(a.created_at).getTime() -
				new Date(b.created_at).getTime()
			);
		});

		rawTasks = tasks as unknown as Partial<TaskSummary>[];
	} else {
		let query = supabase
			.from("ai_tasks")
			.select(
				"id, stage_key, step_number, task_type, status, lo_code, created_at, started_at, completed_at, error_message, user_id, parent_task_id, root_task_id, hierarchy_path, input_data, output_data, prompt_template_id",
			)
			.or(
				`batch_id.eq.${id},launch_id.eq.${id},orchestrator_execution_id.eq.${id}`,
			)
			.order("step_number")
			.order("created_at");

		if (stageKey) {
			query = query.eq("stage_key", stageKey);
		}

		const { data, error } = await query;

		if (error) {
			console.error("Failed to fetch tasks:", error);
			return [];
		}
		rawTasks = (data as unknown as Partial<TaskSummary>[]) || [];
	}

	return rawTasks.map((task) => ({
		id: task.id,
		stage_key: task.stage_key || `stage_${task.step_number || 1}`,
		stage_number: task.step_number || 1,
		task_type: task.task_type,
		status: task.status,
		lo_code: task.lo_code,
		created_at: task.created_at,
		started_at: task.started_at,
		completed_at: task.completed_at,
		error_message: task.error_message,
		user_id: task.user_id,
		parent_task_id: task.parent_task_id,
		root_task_id: task.root_task_id,
		hierarchy_path: parseSafe(task.hierarchy_path) || [],
		input_data: parseSafe(task.input_data),
		output_data: parseSafe(task.output_data),
		prompt_template_id: task.prompt_template_id,
	}));
}
/**
 * Get batch tasks specifically
 */
export async function getBatchTasks(id: string) {
	return getExecutionTasks(id);
}

/**
 * Get list of executions for an orchestrator config
 */
export async function getOrchestratorExecutions(orchestratorId: string) {
	const { data, error } = await supabase
		.from("orchestrator_executions")
		.select("id, status, started_at, completed_at, created_at, input_data")
		.eq("orchestrator_id", orchestratorId)
		.order("created_at", { ascending: false })
		.limit(20);

	if (error) {
		console.error("Failed to fetch executions:", error);
		return [];
	}

	return data || [];
}

/**
 * Subscribe to real-time task updates for a batch
 */
export function subscribeToExecutionUpdates(
	id: string,
	onUpdate: (
		payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
	) => void,
) {
	// We listen to both batch_id and launch_id updates on the same channel
	const channel = supabase
		.channel(`exec_${id}`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "ai_tasks",
				filter: `batch_id=eq.${id}`,
			},
			onUpdate,
		)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "ai_tasks",
				filter: `launch_id=eq.${id}`,
			},
			onUpdate,
		)
		.subscribe();

	return () => {
		supabase.removeChannel(channel);
	};
}

export interface BatchSummary {
	id: string;
	orchestrator_name: string;
	status: string;
	created_at: string;
	task_count: number;
	completed_tasks: number;
	failed_tasks: number;
	progress: number;
	launch_id?: string;
}

/**
 * Get a list of recent batches from the task_batches table
 */
export async function getRecentBatches(
	limit: number = 20,
): Promise<BatchSummary[]> {
	const { storage } = await import("@/lib/storage");
	await storage.waitForAdapter();
	const adapter = storage.adapter;

	// If using IndexedDB (free/BYOK tiers), query there
	if (adapter.constructor.name === "IndexedDBAdapter") {
		const batches = await adapter.listBatches(limit);
		return batches.map((b) => ({
			id: b.id,
			orchestrator_name: b.name || "Generic Execution",
			status: b.status || "pending",
			created_at: b.created_at,
			task_count: b.total_tasks || 0,
			completed_tasks: b.completed_tasks || 0,
			failed_tasks: b.failed_tasks || 0,
			progress:
				(b.total_tasks || 0) > 0
					? Math.round(
							((b.completed_tasks || 0) / b.total_tasks!) * 100,
						)
					: 0,
			launch_id: b.launch_id,
		}));
	}

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return getRecentBatchesFallback(limit);

	const { data, error } = await supabase
		.from("task_batches")
		.select(
			`
            *,
            lab_orchestrator_configs!task_batches_orchestrator_config_id_fkey (
                steps
            )
        `,
		)
		.eq("created_by", user.id)
		.order("created_at", { ascending: false })
		.limit(limit);

	if (!error && data && data.length > 0) {
		return data.map((b) => {
			const total = b.total_tasks || 0;
			const completed = b.completed_tasks || 0;
			const failed = b.failed_tasks || 0;
			const processing = b.processing_tasks || 0;

			let calculatedStatus = b.status || "pending";
			if (total > 0) {
				if (completed + failed >= total) {
					calculatedStatus = failed > 0 ? "failed" : "completed";
				} else if (processing > 0 || completed + failed > 0) {
					calculatedStatus = "processing";
				}
			}

			return {
				id: b.id,
				orchestrator_name: b.name || "Generic Execution",
				status:
					b.status === "completed" || b.status === "failed"
						? b.status
						: calculatedStatus,
				created_at: b.created_at,
				task_count: total,
				completed_tasks: completed,
				failed_tasks: failed,
				progress: total > 0 ? Math.round((completed / total) * 100) : 0,
				launch_id: b.launch_id,
			};
		});
	}

	if (error) {
		console.error("Failed to fetch recent batches:", error);
	}

	return getRecentBatchesFallback(limit);
}

/**
 * Legacy fallback: Grouping recent ai_tasks (used if task_batches is empty or migration not run)
 */
async function getRecentBatchesFallback(
	limit: number = 20,
): Promise<BatchSummary[]> {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return [];

	// Fetch last 200 tasks
	const { data: tasks, error } = await supabase
		.from("ai_tasks")
		.select("id, batch_id, status, created_at, input_data")
		.eq("user_id", user.id)
		.order("created_at", { ascending: false })
		.limit(200);

	if (error || !tasks || tasks.length === 0) return [];

	const batchMap = new Map<string, BatchSummary>();

	tasks.forEach((task) => {
		const batchId = task.batch_id;
		if (!batchId) return;

		if (!batchMap.has(batchId)) {
			const orchestratorName =
				((task.input_data as Record<string, unknown> | null)
					?._orchestrator_name as string) || "Generic Execution";
			batchMap.set(batchId, {
				id: batchId,
				orchestrator_name: orchestratorName,
				status: "plan",
				created_at: task.created_at,
				task_count: 0,
				completed_tasks: 0,
				failed_tasks: 0,
				progress: 0,
			});
		}

		const b = batchMap.get(batchId)!;
		b.task_count++;
		if (task.status === "completed") b.completed_tasks++;
		if (task.status === "failed") b.failed_tasks++;

		if (task.created_at < b.created_at) {
			b.created_at = task.created_at;
		}
	});

	const batches = Array.from(batchMap.values()).map((b) => {
		let status = "processing";
		if (b.completed_tasks === b.task_count) status = "completed";
		else if (b.failed_tasks > 0) status = "failed";
		else if (b.completed_tasks === 0 && b.failed_tasks === 0)
			status = "plan";

		return {
			...b,
			status,
			progress:
				b.task_count > 0
					? Math.round((b.completed_tasks / b.task_count) * 100)
					: 0,
		};
	});

	return batches
		.sort(
			(a, b) =>
				new Date(b.created_at).getTime() -
				new Date(a.created_at).getTime(),
		)
		.slice(0, limit);
}
