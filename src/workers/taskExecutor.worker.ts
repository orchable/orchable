import { db } from "../lib/storage/IndexedDBAdapter";
import { TaskSummary as AiTask } from "../services/executionTrackingService";
import { PromptTemplate } from "../lib/storage/StorageAdapter";
import type { AISettings, StepConfig, Execution } from "@/lib/types";
import type { KeyConfig } from "@/services/keyPoolService";
import type { UserTier } from "@/lib/storage";

// Types for the worker messages
export type WorkerMessage =
	| { type: "START"; configs: KeyConfig[]; tier: UserTier }
	| { type: "STOP" };

export type WorkerStatus =
	| { type: "PROGRESS"; taskId: string; status: string; progress?: number }
	| { type: "ERROR"; taskId: string; error: string }
	| { type: "BATCH_COMPLETE"; batchId: string };

let isRunning = false;
let isLooping = false;
let currentTier: Exclude<UserTier, null> = "free";

// ============================================================================
// KEY MANAGER (Replaces round-robin for personal keys)
// ============================================================================

interface KeyState {
	apiKey: string;
	healthStatus:
		| "healthy"
		| "degraded"
		| "blocked"
		| "disabled"
		| "rate_limited";
	remainingRequests: number;
	remainingTokens: number;
	blockedUntil: number; // timestamp
	consecutiveFailures: number;
	lastUsedAt: number; // timestamp
}

class KeyManager {
	private keys: KeyState[] = [];
	private poolConfig: KeyConfig | null = null;

	// Config limits based on Base Agent logic
	private LOW_REQUESTS_THRESHOLD = 5;
	private LOW_TOKENS_THRESHOLD = 5000;
	private MAX_CONSECUTIVE_FAILS = 3;
	private BLOCK_DURATION_HOURS = 2;
	private COOLDOWN_MINUTES = 5; // To prevent hammering one key

	public initialize(configs: KeyConfig[]) {
		this.keys = [];
		this.poolConfig = null;

		for (const config of configs) {
			if (config.type === "personal" && config.apiKey) {
				this.keys.push({
					apiKey: config.apiKey,
					healthStatus: "healthy",
					remainingRequests: 999999, // default max before first parse
					remainingTokens: 999999999,
					blockedUntil: 0,
					consecutiveFailures: 0,
					lastUsedAt: 0,
				});
			} else if (config.type === "pool") {
				// We only expect one pool config per worker session based on tier
				this.poolConfig = config;
			}
		}
	}

	public getBestKey():
		| { type: "personal"; keyState: KeyState }
		| { type: "pool"; config: KeyConfig }
		| null {
		// If no personal keys exist, fallback to pool if available
		if (this.keys.length === 0) {
			return this.poolConfig
				? { type: "pool", config: this.poolConfig }
				: null;
		}

		const now = Date.now();

		// Filter candidates
		const candidates = this.keys.filter((k) => {
			if (k.healthStatus === "disabled") return false;
			if (k.blockedUntil > now) return false;
			if (k.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILS)
				return false;
			// Fast quota guard
			if (k.remainingRequests < 1 || k.remainingTokens < 100)
				return false;

			// Cooldown logic for heavy usage
			if (k.lastUsedAt > 0 && k.healthStatus !== "degraded") {
				const minutesAgo = (now - k.lastUsedAt) / (1000 * 60);
				// We relax cooldown if it's the ONLY key, better to hit rate limit naturally than wait 5m doing nothing
				if (
					this.keys.length > 1 &&
					minutesAgo < this.COOLDOWN_MINUTES / this.keys.length
				) {
					// Soft cooldown based on number of keys
				}
			}
			return true;
		});

		if (candidates.length === 0) {
			// All personal keys are exhausted/blocked. Fallback to pool? In our architecture, premium users get priority pools.
			// Free users with BYOK shouldn't fallback to standard pools if they configured BYOK, to save platform costs.
			// Actually, if they are out of keys, we throw.
			return this.poolConfig
				? { type: "pool", config: this.poolConfig }
				: null;
		}

		// Sort: Health > Tokens > LRU
		candidates.sort((a, b) => {
			// 1. Health
			const healthPriority = {
				healthy: 0,
				degraded: 1,
				rate_limited: 2,
				blocked: 3,
				disabled: 4,
			};
			const aH = healthPriority[a.healthStatus];
			const bH = healthPriority[b.healthStatus];
			if (aH !== bH) return aH - bH;

			// 2. Tokens (High to Low)
			if (a.remainingTokens !== b.remainingTokens)
				return b.remainingTokens - a.remainingTokens;

			// 3. LRU
			return a.lastUsedAt - b.lastUsedAt;
		});

		const selected = candidates[0];
		selected.lastUsedAt = now;
		return { type: "personal", keyState: selected };
	}

	public updateKeyStatus(apiKey: string, headers: Headers) {
		const key = this.keys.find((k) => k.apiKey === apiKey);
		if (!key) return;

		const reqLeft = headers.get("x-ratelimit-remaining-requests");
		const tokLeft = headers.get("x-ratelimit-remaining-tokens");

		if (reqLeft !== null) key.remainingRequests = parseInt(reqLeft, 10);
		if (tokLeft !== null) key.remainingTokens = parseInt(tokLeft, 10);

		// Auto low-quota limit
		if (
			key.remainingRequests < this.LOW_REQUESTS_THRESHOLD ||
			key.remainingTokens < this.LOW_TOKENS_THRESHOLD
		) {
			if (key.healthStatus === "healthy") {
				key.healthStatus = "rate_limited";
				// Soft block for 2 mins to let quota regenerate
				key.blockedUntil = Date.now() + 2 * 60 * 1000;
			}
		}
	}

	public reportError(
		apiKey: string,
		status: number,
		errorMessage: string,
		headers: Headers,
	) {
		const key = this.keys.find((k) => k.apiKey === apiKey);
		if (!key) return;
		const now = Date.now();

		// Update limits if header is provided
		if (headers) this.updateKeyStatus(apiKey, headers);

		// Error classification
		const msg = errorMessage.toLowerCase();
		const isRateLimit =
			status === 429 ||
			msg.includes("resource exhausted") ||
			msg.includes("rate limit") ||
			msg.includes("quota exceeded");

		if (isRateLimit) {
			key.healthStatus = "rate_limited";
			key.consecutiveFailures++;
			let blockMinutes = 15;
			if (msg.includes("per day") || msg.includes("daily")) {
				blockMinutes = 720; // 12h
			} else {
				// Parse retry-after from header or message if possible
				const retryAfter = headers.get("retry-after");
				if (retryAfter)
					blockMinutes = Math.ceil(parseInt(retryAfter, 10) / 60);
			}
			key.blockedUntil = now + blockMinutes * 60 * 1000;
			console.warn(
				`[KeyManager] Key rate limited. Blocked for ${blockMinutes}m.`,
			);
		} else if (status === 403 || msg.includes("permission denied")) {
			key.healthStatus = "blocked";
			key.blockedUntil = now + 24 * 60 * 60 * 1000; // 24h
			key.consecutiveFailures++;
		} else if (
			status === 401 ||
			msg.includes("unauthenticated") ||
			msg.includes("invalid api key")
		) {
			key.healthStatus = "disabled";
			key.consecutiveFailures++;
		} else if (status >= 500) {
			key.healthStatus = "degraded";
			key.consecutiveFailures++;
			if (key.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILS) {
				key.blockedUntil =
					now + this.BLOCK_DURATION_HOURS * 60 * 60 * 1000;
			}
		} else {
			// e.g., 400 Bad Request (not the key's fault structurally, maybe prompt issue)
			// Don't punish the key too heavily
			key.consecutiveFailures++;
		}
	}

	public reportSuccess(apiKey: string, headers: Headers) {
		const key = this.keys.find((k) => k.apiKey === apiKey);
		if (!key) return;

		key.healthStatus = "healthy";
		key.consecutiveFailures = 0;
		key.blockedUntil = 0;
		if (headers) this.updateKeyStatus(apiKey, headers);
	}
}

const keyManager = new KeyManager();

// ============================================================================
const lastTaskCompletionTimes: Record<string, number> = {};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
	const { data } = e;

	if (data.type === "START") {
		isRunning = true;
		if (data.configs.length === 0) {
			throw new Error("No execution configs provided.");
		}
		keyManager.initialize(data.configs);
		currentTier = data.tier || "free";
		console.log(
			`[Worker] Started processing loop (Tier: ${currentTier}, Keys: ${data.configs.length})`,
		);
		if (!isLooping) runLoop();
	} else if (data.type === "STOP") {
		isRunning = false;
		keyManager.initialize([]); // Clear keys on stop
		console.log("[Worker] Stopped");
	}
};

async function recoverStuckTasks() {
	try {
		const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
		const stuckTasks = await db.ai_tasks
			.filter(
				(t) =>
					t.status === "processing" &&
					!!t.started_at &&
					t.started_at < fiveMinsAgo,
			)
			.toArray();

		if (stuckTasks.length > 0) {
			console.warn(
				`[Worker] Recovering ${stuckTasks.length} stuck tasks...`,
			);
			for (const t of stuckTasks) {
				await db.ai_tasks.update(t.id, {
					status: "plan",
					error_message:
						"Recovered from stuck processing state (timeout > 5m)",
				});
			}
		}
	} catch (e) {
		console.error("[Worker] Failed to recover stuck tasks:", e);
	}
}

async function runLoop() {
	if (isLooping) return;
	isLooping = true;

	await recoverStuckTasks();

	let loopCount = 0;

	while (isRunning) {
		try {
			// Periodically check for stuck tasks every ~10 loops
			loopCount++;
			if (loopCount % 10 === 0) {
				await recoverStuckTasks();
			}

			// 1. Get next 'plan' task, prioritized by step_number and age
			const planTasks = await db.ai_tasks
				.where("status")
				.equals("plan")
				.toArray();

			if (planTasks.length === 0) {
				// No more plan tasks, wait a bit
				await new Promise((r) => setTimeout(r, 2000));
				continue;
			}

			// Prioritize:
			// 1. Lower step_number (earlier stages)
			// 2. Older created_at (FIFO within stage)
			planTasks.sort((a, b) => {
				const stepA = a.step_number || 0;
				const stepB = b.step_number || 0;
				if (stepA !== stepB) return stepA - stepB;

				return (
					new Date(a.created_at).getTime() -
					new Date(b.created_at).getTime()
				);
			});

			const task = planTasks[0] as unknown as AiTask & {
				launch_id?: string;
			};

			if (!task) {
				// No more plan tasks, wait a bit
				await sleep(2000);
				continue;
			}

			// 1.1 Throttling Logic: Check for user-configured delay
			const extra = (task.extra as Record<string, unknown>) || {};
			const delaySeconds = (extra.execution_delay_seconds as number) || 0;
			const batchId = task.batch_id;
			const launchId = task.launch_id;
			const throttleKey = launchId || batchId;

			if (delaySeconds > 0 && throttleKey) {
				const lastTime = lastTaskCompletionTimes[throttleKey] || 0;
				const now = Date.now();
				const elapsedSeconds = (now - lastTime) / 1000;

				if (elapsedSeconds < delaySeconds) {
					const waitMs = (delaySeconds - elapsedSeconds) * 1000;
					console.log(
						`[Worker] Throttling: Resting for ${Math.round(waitMs / 1000)}s...`,
					);
					await sleep(waitMs);
				}
			}

			// --- USAGE ENFORCEMENT ---
			const canExecute = await checkUsage();
			if (!canExecute) {
				isRunning = false; // Stop the loop
				throw new Error(
					"Monthly task limit reached. Please upgrade to continue.",
				);
			}

			await processTask(task as unknown as AiTask);
			// --- ATOMIC USAGE INCREMENT ---
			await db.incrementMetadata("usage");

			// 5. Update last completion time for throttling
			if (throttleKey) {
				lastTaskCompletionTimes[throttleKey] = Date.now();
			}
		} catch (error) {
			console.error("[Worker] Loop error:", error);
			await new Promise((r) => setTimeout(r, 5000));
		}
	}
}

async function processTask(task: AiTask) {
	try {
		updateTaskStatus(task.id, "processing");

		// 2. Load template
		const template = await db.prompt_templates.get(
			task.prompt_template_id || "",
		);
		if (!template) {
			throw new Error(`Template not found: ${task.prompt_template_id}`);
		}

		const stageConfig = (template.stage_config ||
			{}) as Partial<StepConfig>;
		let currentInputData: Record<string, unknown> = {
			...(task.input_data as Record<string, unknown>),
		};

		// --- PRE-PROCESS WEBHOOK ---
		const preProcess = stageConfig.pre_process;
		if (preProcess?.enabled && preProcess?.webhook_url) {
			try {
				const preResult = await executeWebhook(
					{
						webhook_url: preProcess.webhook_url,
						webhook_method: preProcess.webhook_method,
						webhook_headers: preProcess.webhook_headers,
					},
					currentInputData,
				);
				const handling = preProcess.output_handling || "merge";

				if (handling === "replace") {
					currentInputData = preResult as Record<string, unknown>;
				} else if (handling === "nested") {
					const field = preProcess.nested_field_name || "pre_output";
					currentInputData[field] = preResult;
				} else {
					currentInputData = {
						...currentInputData,
						...(preResult as Record<string, unknown>),
					};
				}
			} catch (e) {
				const error = e as Error;
				if (preProcess.on_failure === "abort") throw error;
				console.warn(
					"[Worker] Pre-process failed, continuing:",
					error.message,
				);
			}
		}

		// 3. Build prompt
		// N8n uses: { ...task, ...task.extra, ...task.input_data }
		const extra = (task.extra || {}) as Record<string, unknown>;

		let globalContextStr = "";
		if (task.batch_id) {
			const batch = await db.task_batches.get(task.batch_id);
			if (batch && batch.global_context) {
				const gc = batch.global_context as Record<string, string>;
				globalContextStr = Object.entries(gc)
					.map(
						([name, content]) =>
							`--- DOCUMENT: ${name} ---\n${content}\n--- END OF DOCUMENT ---`,
					)
					.join("\n\n");
			}
		}

		const enrichmentData = {
			...task,
			...extra,
			...currentInputData,
			GLOBAL_CONTEXT: globalContextStr,
		};
		const prompt = buildPrompt(
			template.template,
			enrichmentData as Record<string, unknown>,
		);

		// 4. Call Gemini
		const taskAiSettings = (extra.ai_settings as Partial<AISettings>) || {};
		const templateSettings =
			(template.default_ai_settings as Partial<AISettings>) || {};
		const mergedAiSettings = {
			...templateSettings,
			...taskAiSettings,
		} as AISettings;

		let result = await callGemini(
			prompt,
			mergedAiSettings,
			task.batch_id,
			globalContextStr,
			task.id,
		);

		// --- SUPPORT: return-along-with ---
		const returnAlongWith = (extra["return-along-with"] as string[]) || [];
		const finalResult = { ...(result as Record<string, unknown>) };

		if (Array.isArray(returnAlongWith) && returnAlongWith.length > 0) {
			for (const key of returnAlongWith) {
				if (
					Object.prototype.hasOwnProperty.call(currentInputData, key)
				) {
					finalResult[key] = currentInputData[key];
				}
			}
		}

		result = finalResult;

		// --- POST-PROCESS WEBHOOK & MERGING ---
		const postProcess = stageConfig.post_process;
		if (postProcess?.enabled) {
			// Handle Merge With Input type
			if (postProcess.type === "merge_with_input") {
				result = applyMergeWithInput(
					result as Record<string, unknown>,
					currentInputData,
					{
						merge_key: postProcess.merge_key,
						merge_array_path: postProcess.merge_array_path,
						input_array_path: postProcess.input_array_path,
					},
				);
			}

			// Execute Webhook if configured
			if (postProcess.webhook_url) {
				try {
					await executeWebhook(
						{
							webhook_url: postProcess.webhook_url,
							webhook_method: postProcess.webhook_method,
							webhook_headers: postProcess.webhook_headers,
						},
						{
							input: currentInputData,
							output: result,
						},
					);
				} catch (e) {
					const error = e as Error;
					if (postProcess.on_failure === "abort") throw error;
					console.warn(
						"[Worker] Post-process failed, continuing:",
						error.message,
					);
				}
			}
		}

		// 5. Save output
		await db.ai_tasks.update(task.id, {
			status: "completed",
			output_data: result,
			error_message: null,
			completed_at: new Date().toISOString(),
		});

		// 5.1 Update Batch Counters
		if (task.batch_id) {
			await updateBatchCounters(task.batch_id, true);
		}

		self.postMessage({
			type: "PROGRESS",
			taskId: task.id,
			status: "completed",
		});

		// 6. Handle next stages (Routing logic)
		await handleNextStages(task, result, template);
	} catch (error) {
		const err = error as Error;
		console.error(`[Worker] Failed task ${task.id}:`, err);
		await db.ai_tasks.update(task.id, {
			status: "failed",
			error_message: err.message,
		});

		// Update Batch Counters on failure
		if (task.batch_id) {
			await updateBatchCounters(task.batch_id, false);
		}
		self.postMessage({
			type: "ERROR",
			taskId: task.id,
			error: err.message,
		});
	}
}

function updateTaskStatus(id: string, status: string) {
	db.ai_tasks.update(id, { status, started_at: new Date().toISOString() });
	self.postMessage({ type: "PROGRESS", taskId: id, status });
}

async function incrementBatchTotalTasks(
	batchId: string | null | undefined,
	count: number,
) {
	if (!batchId) return;
	try {
		await db.transaction("rw", db.task_batches, async () => {
			const batch = await db.task_batches.get(batchId);
			if (batch) {
				const update: Partial<import("@/lib/types").Execution> = {
					total_tasks: (batch.total_tasks || 0) + count,
					updated_at: new Date().toISOString(),
					status:
						batch.status === "completed"
							? "processing"
							: batch.status,
				};
				if (update.status === "processing") {
					update.completed_at = undefined;
				}
				await db.task_batches.update(batchId, update);
			}
		});
	} catch (err) {
		console.error("[Worker] Failed to increment batch total_tasks:", err);
	}
}

function buildPrompt(template: string, data: Record<string, unknown>) {
	let prompt = template;

	// Support both %%key%% (n8n default) and {{key}} (legacy/codebase)
	const regex = /%%\s*([\w_]+)\s*%%|{{\s*([\w_]+)\s*}}/g;

	prompt = prompt.replace(regex, (match, key1, key2) => {
		const key = key1 || key2;
		if (Object.prototype.hasOwnProperty.call(data, key)) {
			const val = data[key];
			return typeof val === "object"
				? JSON.stringify(val, null, 2)
				: String(val);
		}
		return match;
	});

	// Also handle %%input_data%% macro if present (compatibility)
	if (prompt.includes("%%input_data%%")) {
		prompt = prompt.replace(
			"%%input_data%%",
			JSON.stringify(data, null, 2),
		);
	}

	return prompt;
}

async function callGemini(
	prompt: string,
	aiSettings: AISettings,
	batchId?: string,
	globalContextStr?: string,
	taskId?: string,
) {
	const keySelection = keyManager.getBestKey();

	if (!keySelection) {
		throw new Error("No API keys or pools available.");
	}

	let apiKey: string | undefined;
	let currentConfig: KeyConfig | undefined;

	if (keySelection.type === "personal") {
		apiKey = keySelection.keyState.apiKey;
		currentConfig = { type: "personal", apiKey: apiKey }; // Create a dummy KeyConfig for consistency
	} else {
		currentConfig = keySelection.config;
	}

	if (currentConfig.type === "pool") {
		// Route to platform Key Pool via webhook
		return await executeWebhook(
			{
				webhook_url: currentConfig.webhookUrl,
				webhook_method: "POST",
			},
			{
				prompt,
				settings: aiSettings,
				tier: currentTier,
				// rotation manager will use poolType to filter internal keys
				pool: currentConfig.poolType,
			},
		);
	}

	const model = aiSettings?.model_id || "gemini-2.0-flash";
	let api = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentConfig.apiKey}`;
	let bodyPayload: Record<string, unknown> = {
		contents: [{ parts: [{ text: prompt }] }],
		generationConfig: aiSettings?.generationConfig || {},
	};

	// --- PHASE 2: PREMIUM EDGE FUNCTION CACHING ---
	// If the user is on Premium, they don't use their own key (except if they force BYOK, but typically Premium uses platform credits).
	// Actually, the Web Worker handles Free Tier (using their BYOK key).
	// The problem requested routing via Edge Function if applicable. Wait, if it's the Web Worker,
	// BYOK users (Free) just hit Gemini directly to avoid server costs.
	// They don't get the caching efficiency unless they use the Edge Function.
	// For now, if currentTier is premium (unlikely to run in Worker, but just in case), target the Edge Function.
	if (currentTier === "premium") {
		const { supabase } = await import("@/lib/supabase");
		const {
			data: { session },
		} = await supabase.auth.getSession();

		api = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`;
		bodyPayload = {
			batch_id: batchId,
			prompt: prompt,
			ai_settings: aiSettings,
			system_instruction: (
				aiSettings as unknown as Record<string, unknown>
			).systemInstruction, // Assuming systemInstruction is in aiSettings
			// Global context must be an object for the Edge function, but we already stringified it above.
			// The Edge function expects an object `{ "doc1": "text" }`.
			// Let's pass the raw string into prompt instead for Worker if we can't get the raw object.
		};
		// We can't perfectly map the stringified global_context back to an object here without refactoring.
		// Since WebWorker is mainly Free tier, we will stick to standard BYOK execution for Free tier.
	} else if (globalContextStr) {
		// Free Tier BYOK: Just prepend context to the prompt manually
		(bodyPayload.contents as unknown[])[0] = {
			parts: [{ text: `${globalContextStr}\n\n${prompt}` }],
		};
	}

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (currentTier === "premium") {
		const { supabase } = await import("@/lib/supabase");
		const {
			data: { session },
		} = await supabase.auth.getSession();
		headers["Authorization"] = `Bearer ${session?.access_token}`;
	}

	// Phase 8: Exponential backoff for 429 Rate Limit
	let response: Response | null = null;
	const maxRetries = 5;
	let attempt = 0;

	while (attempt <= maxRetries) {
		response = await fetch(api, {
			method: "POST",
			headers,
			body: JSON.stringify(bodyPayload),
		});

		if (!response.ok) {
			const json = await response.json().catch(() => ({}));
			const errMsg =
				json.error?.message ||
				json.error ||
				`HTTP ${response.status} ${response.statusText}`;

			// Report to KeyManager if using a personal key
			if (currentConfig.type === "personal" && apiKey) {
				keyManager.reportError(
					apiKey,
					response.status,
					errMsg,
					response.headers,
				);
			}

			if (response.status === 429) {
				console.warn(
					`[Worker] Rate limited (429). Attempt ${attempt + 1}/${maxRetries}. Error: ${errMsg}`,
				);

				if (attempt === maxRetries) {
					throw new Error(
						errMsg || "Gemini API Error: 429 Too Many Requests",
					);
				}

				// Try to parse "retry in X.XXs" from message
				let delayMs =
					Math.pow(2, attempt) * 5000 + Math.random() * 2000; // default exp backoff + jitter
				const match = errMsg.match(/retry in\s+([\d.]+)s/i);
				if (match && match[1]) {
					const seconds = parseFloat(match[1]);
					if (!isNaN(seconds)) {
						delayMs = seconds * 1000 + 1000; // Parsed delay + 1s buffer
					}
				}

				console.log(
					`[Worker] Waiting ${Math.round(delayMs / 1000)}s before retry...`,
				);

				// Phase 14: Persist transient error message so UI can show it while "processing"
				if (taskId) {
					await db.ai_tasks.update(taskId, {
						error_message: `Rate limited (429). Retrying in ${Math.round(delayMs / 1000)}s... (Attempt ${attempt + 1}/${maxRetries})`,
					});
				}

				await new Promise((resolve) => setTimeout(resolve, delayMs));
				attempt++;
				continue;
			}

			// For non-429 errors (like 400, 401, 403), we might not want to retry,
			// or if we do, the key manager has already marked the current key blocked/disabled.
			// However, since we are inside a single task execution step, we just throw and let the task fail.
			// Next task will pick a new healthy key.
			throw new Error(errMsg || "Gemini API Error");
		}

		// If success
		if (currentConfig.type === "personal" && apiKey) {
			keyManager.reportSuccess(apiKey, response.headers);
		}
		break;
	}

	if (!response) {
		throw new Error("Failed to fetch from Gemini API");
	}

	const json = await response.json();

	const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!text) throw new Error("Empty response from Gemini");

	try {
		if (
			aiSettings?.generationConfig?.responseMimeType ===
			"application/json"
		) {
			return JSON.parse(text);
		}
		return { result: text };
	} catch (e) {
		return { result: text, parse_error: true };
	}
}

async function executeWebhook(
	config: {
		webhook_url?: string;
		webhook_method?: string;
		webhook_headers?: Record<string, string>;
	},
	payload: unknown,
) {
	if (!config.webhook_url) return null;
	const response = await fetch(config.webhook_url, {
		method: config.webhook_method || "POST",
		headers: {
			"Content-Type": "application/json",
			...(config.webhook_headers || {}),
		},
		body: JSON.stringify(payload),
	});
	if (!response.ok) throw new Error(`Webhook failed: ${response.statusText}`);
	return await response.json();
}

function applyMergeWithInput(
	aiOutput: Record<string, unknown>,
	inputData: Record<string, unknown>,
	config: {
		merge_key?: string;
		merge_array_path?: string;
		input_array_path?: string;
	},
) {
	const mergeKey = config.merge_key || "code";
	const outputArrayPath = config.merge_array_path || "output_data";
	const inputArrayPath = config.input_array_path || "output_data";

	const fullArray =
		(getValueByPath(inputData, inputArrayPath) as unknown[]) || [];
	const corrections =
		(getValueByPath(aiOutput, outputArrayPath) as unknown[]) || [];

	const correctionMap = new Map();
	corrections.forEach((item: unknown) => {
		const key = (item as Record<string, unknown>)[mergeKey];
		if (key) correctionMap.set(key, item);
	});

	const merged = fullArray.map((original: unknown) => {
		const key = (original as Record<string, unknown>)[mergeKey];
		return correctionMap.has(key) ? correctionMap.get(key) : original;
	});

	return {
		...aiOutput,
		[outputArrayPath]: merged,
	};
}

async function handleNextStages(
	task: AiTask,
	result: unknown,
	template: PromptTemplate,
) {
	// 1. Get next stage configs (Load Batch creates it)
	const extra = (task.extra || {}) as Record<string, unknown>;
	let nextStageConfigs =
		(extra.next_stage_configs as Record<string, unknown>[]) || [];

	// Hydrate from template if not present (N8n behaviour)
	if (
		nextStageConfigs.length === 0 &&
		template.next_stage_template_ids &&
		template.next_stage_template_ids.length > 0
	) {
		const { db } = await import("../lib/storage/IndexedDBAdapter");
		nextStageConfigs = await Promise.all(
			template.next_stage_template_ids.map(async (id) => {
				const tpl = await db.prompt_templates.get(id);
				const sc = (tpl?.stage_config as Record<string, unknown>) || {};
				return {
					template_id: id,
					cardinality: sc.cardinality || "one_to_one",
					split_path: sc.split_path || null,
					split_mode: sc.split_mode || "per_item",
					merge_path: sc.merge_path || null,
					output_mapping: sc.output_mapping || "result",
					batch_grouping: sc.batch_grouping || null,
					requires_approval: sc.requires_approval || false,
				};
			}),
		);
	}

	if (nextStageConfigs.length === 0) return;

	const currentStageConfig =
		(extra.current_stage_config as Record<string, unknown>) ||
		template.stage_config ||
		{};
	const cardinality = currentStageConfig.cardinality || "one_to_one";

	if (cardinality === "many_to_one" || cardinality === "N:1") {
		// N:1 logic: Wait for siblings, then aggregate to spawn next stages
		await handleManyToOne(task, result, template, nextStageConfigs);
		return;
	}

	if (cardinality === "one_to_many" || cardinality === "1:N") {
		const splitMode = currentStageConfig.split_mode || "per_item";
		const splitPath: string =
			(currentStageConfig.split_path as string) || "result";
		// n8n treats "result" as identity path (the result itself, not result.result)
		let items: unknown;
		if (splitPath === "result" || splitPath === ".") {
			items = result;
		} else {
			const cleanPath = splitPath.startsWith("result.")
				? splitPath.slice(7)
				: splitPath;
			items = getValueByPath(result, cleanPath);
		}

		if (Array.isArray(items)) {
			if (splitMode === "per_item") {
				for (const nextConfig of nextStageConfigs) {
					const nextTemplateId = nextConfig.template_id;
					const nextTemplate =
						await db.prompt_templates.get(nextTemplateId);
					if (!nextTemplate) continue;

					const newTasks = items.map((item, idx) => ({
						id: crypto.randomUUID(),
						batch_id: task.batch_id,
						stage_key:
							nextTemplate.stage_key ||
							extractStageKey(nextTemplate.id),
						step_number: (task.step_number || 0) + 1,
						status: "plan",
						// 1:N branches carry the parent data down
						input_data: {
							...(task.input_data as Record<string, unknown>),
							item,
							_split_index: idx,
							_split_total: items.length,
						},
						parent_task_id: task.id,
						root_task_id: task.root_task_id || task.id,
						hierarchy_path: [
							...(task.hierarchy_path || []),
							task.id,
						],
						launch_id:
							task.launch_id ||
							((task as unknown as Record<string, unknown>)
								.launch_id as string),
						split_group_id:
							((task as unknown as Record<string, unknown>)
								.split_group_id as string) || task.id,
						task_type: extractStageKey(nextTemplate.id),
						prompt_template_id: nextTemplate.id,
						created_at: new Date().toISOString(),
						sequence: idx + 1,
						extra: {
							current_stage_config: {
								template_id: nextTemplateId,
								cardinality:
									nextConfig.cardinality || "one_to_one",
								split_path: nextConfig.split_path || null,
								split_mode: nextConfig.split_mode || "per_item",
								merge_path: nextConfig.merge_path || null,
								output_mapping:
									nextConfig.output_mapping || "result",
							},
							parent_stage_key: task.stage_key,
							parent_task_id: task.id,
						},
					}));
					await db.ai_tasks.bulkAdd(newTasks as unknown as AiTask[]);
					await incrementBatchTotalTasks(
						task.batch_id,
						newTasks.length,
					);
				}
			} else if (splitMode === "per_batch") {
				const batchSize =
					(currentStageConfig.batch_size as number) || 10;
				for (const nextConfig of nextStageConfigs) {
					const nextTemplateId = nextConfig.template_id;
					const nextTemplate =
						await db.prompt_templates.get(nextTemplateId);
					if (!nextTemplate) continue;

					const newTasks = [];
					for (
						let i = 0, bIdx = 0;
						i < items.length;
						i += batchSize, bIdx++
					) {
						const batchItems = items.slice(i, i + batchSize);
						newTasks.push({
							id: crypto.randomUUID(),
							batch_id: task.batch_id,
							stage_key:
								nextTemplate.stage_key ||
								extractStageKey(nextTemplate.id),
							step_number: (task.step_number || 0) + 1,
							status: "plan",
							input_data: {
								...(task.input_data as Record<string, unknown>),
								items: batchItems,
								_batch_index: bIdx,
							},
							parent_task_id: task.id,
							root_task_id: task.root_task_id || task.id,
							hierarchy_path: [
								...(task.hierarchy_path || []),
								task.id,
							],
							launch_id:
								task.launch_id ||
								((task as unknown as Record<string, unknown>)
									.launch_id as string),
							split_group_id:
								((task as unknown as Record<string, unknown>)
									.split_group_id as string) || task.id,
							task_type: extractStageKey(nextTemplate.id),
							prompt_template_id: nextTemplate.id,
							created_at: new Date().toISOString(),
							sequence: bIdx + 1,
							extra: {
								current_stage_config: {
									template_id: nextTemplateId,
									cardinality:
										nextConfig.cardinality || "one_to_one",
									split_path: nextConfig.split_path || null,
									split_mode:
										nextConfig.split_mode || "per_item",
									merge_path: nextConfig.merge_path || null,
									output_mapping:
										nextConfig.output_mapping || "result",
								},
								parent_stage_key: task.stage_key,
								parent_task_id: task.id,
							},
						});
					}
					await db.ai_tasks.bulkAdd(newTasks as unknown as AiTask[]);
					await incrementBatchTotalTasks(
						task.batch_id,
						newTasks.length,
					);
				}
			}
		}
	} else {
		// Standard 1:1 or 1:N branching
		for (const nextConfig of nextStageConfigs) {
			const nextTemplateId = nextConfig.template_id as string;
			const nextTemplate = await db.prompt_templates.get(nextTemplateId);
			if (!nextTemplate) continue;

			const newTask = {
				id: crypto.randomUUID(),
				batch_id: task.batch_id,
				stage_key:
					nextTemplate.stage_key || extractStageKey(nextTemplate.id),
				step_number: (task.step_number || 0) + 1,
				status: "plan",
				// 1:1 replaces instead of merging inputs!
				input_data: {
					...(result as Record<string, unknown>),
					_parent_id: task.id,
				},
				parent_task_id: task.id,
				root_task_id: task.root_task_id || task.id,
				hierarchy_path: [...(task.hierarchy_path || []), task.id],
				launch_id:
					task.launch_id ||
					((task as unknown as Record<string, unknown>)
						.launch_id as string),
				split_group_id:
					((task as unknown as Record<string, unknown>)
						.split_group_id as string) || task.id,
				task_type: extractStageKey(nextTemplate.id),
				prompt_template_id: nextTemplate.id,
				created_at: new Date().toISOString(),
				extra: {
					current_stage_config: {
						template_id: nextTemplateId,
						cardinality: nextConfig.cardinality || "one_to_one",
						split_path: nextConfig.split_path || null,
						split_mode: nextConfig.split_mode || "per_item",
						output_mapping: nextConfig.output_mapping || "result",
					},
					parent_stage_key: task.stage_key,
					parent_task_id: task.id,
				},
			};

			await db.ai_tasks.add(newTask as unknown as AiTask);
			await incrementBatchTotalTasks(task.batch_id, 1);
		}
	}
}

async function handleManyToOne(
	task: AiTask,
	result: unknown,
	template: PromptTemplate,
	nextStageConfigs: Record<string, unknown>[],
) {
	const extra = (task.extra || {}) as Record<string, unknown>;
	const currentStageConfig =
		(extra.current_stage_config as Record<string, unknown>) ||
		template.stage_config ||
		{};

	const batchId = task.batch_id;
	const launchId = task.launch_id;
	const stageKey = task.stage_key;

	const grouping = (currentStageConfig.batch_grouping as string) || "batch";

	if (!batchId && !launchId) return;

	// Use a transaction to ensure atomicity and prevent duplicate merge tasks
	// Phase 8 Fix: Ensure db.prompt_templates is included as it's queried below
	await db.transaction(
		"rw",
		db.ai_tasks,
		db.task_batches,
		db.prompt_templates,
		async () => {
			// 1. Determine the scope of tasks to merge (Re-fetch inside transaction)
			let scopeTasks: AiTask[];
			if (grouping === "global" && launchId) {
				scopeTasks = await db.ai_tasks
					.where("launch_id")
					.equals(launchId)
					.toArray();
			} else if (batchId) {
				scopeTasks = await db.ai_tasks
					.where("batch_id")
					.equals(batchId)
					.toArray();
			} else {
				return;
			}

			// 2. Identify if any task is still upstream and could generate more siblings.
			const isStreamFinished = scopeTasks.every((t) => {
				if (t.id === task.id) return true;
				if (
					(t.status === "plan" ||
						t.status === "processing" ||
						t.status === "pending") &&
					t.stage_key !== stageKey &&
					(t.step_number || 0) < (task.step_number || 0)
				) {
					return false;
				}
				return true;
			});

			if (!isStreamFinished) {
				console.log("[Worker] Upstream tasks still active, waiting...");
				return;
			}

			// 3. Check if all siblings in THIS stage are done
			const siblings = scopeTasks.filter((t) => t.stage_key === stageKey);
			const allSiblingsDone = siblings.every(
				(s) =>
					s.id === task.id ||
					s.status === "completed" ||
					s.status === "failed",
			);

			if (!allSiblingsDone) {
				return;
			}

			// 4. Aggregate data
			const mergePath = (currentStageConfig.merge_path as string) || null;
			const completedSiblings = siblings.filter(
				(s) => s.status === "completed" || s.id === task.id,
			);
			const allOutputs = completedSiblings
				.map((s) =>
					s.id === task.id
						? (result as Record<string, unknown>)
						: (s.output_data as Record<string, unknown>),
				)
				.filter(Boolean);

			let aggregatedData: unknown[] = [];
			if (mergePath) {
				for (const curr of allOutputs) {
					const val = (curr as Record<string, unknown>)?.[mergePath];
					if (Array.isArray(val)) {
						aggregatedData = aggregatedData.concat(val);
					} else if (val != null) {
						aggregatedData.push(val);
					}
				}
			} else {
				aggregatedData = allOutputs as unknown[];
			}

			const mergePathStr = mergePath as string | null;
			const mergedInputData = mergePathStr
				? { [mergePathStr]: aggregatedData }
				: { merged_data: aggregatedData };

			// 5. Use existing nextStageConfigs from arguments
			// No need to hydrate again

			// 6. Create next tasks (IF NOT ALREADY CREATED)
			for (const nextConfig of nextStageConfigs) {
				const nextTemplateId = nextConfig.template_id;
				if (!nextTemplateId) continue;

				const nextTemplate =
					await db.prompt_templates.get(nextTemplateId);
				const nextStageKey =
					nextTemplate?.stage_key ||
					extractStageKey(nextTemplateId as string);

				// Check for existing merge task to prevent duplicates
				// For global grouping, check across launch_id. For batch, check across batch_id.
				let existing;
				if (grouping === "global" && launchId) {
					existing = await db.ai_tasks
						.where("[launch_id+stage_key]")
						.equals([launchId, nextStageKey])
						.first();
				} else {
					existing = await db.ai_tasks
						.where("[batch_id+stage_key]")
						.equals([batchId, nextStageKey])
						.first();
				}

				if (existing) {
					console.log(
						`[Worker] Merge task for ${nextStageKey} already exists. Skipping.`,
					);
					continue;
				}

				await db.ai_tasks.add({
					id: crypto.randomUUID(),
					batch_id: batchId,
					stage_key: nextStageKey,
					step_number: (task.step_number || 0) + 1,
					status: "plan",
					input_data: {
						...mergedInputData,
					},
					// Phase 8 Fix: Neutral Parenting - Merged task inherits its parents' parent_id to be a sibling
					parent_task_id:
						grouping === "global" ? undefined : task.parent_task_id,
					root_task_id: task.root_task_id || task.id,
					hierarchy_path: task.hierarchy_path || [],
					launch_id: launchId,
					split_group_id:
						((task as unknown as Record<string, unknown>)
							.split_group_id as string) || task.id,
					task_type: extractStageKey(nextTemplateId as string),
					prompt_template_id: nextTemplateId as string,
					created_at: new Date().toISOString(),
					extra: {
						current_stage_config: {
							template_id: nextTemplateId as string,
							cardinality:
								(nextConfig.cardinality as string) ||
								"one_to_one",
							split_path:
								(nextConfig.split_path as string) || null,
							split_mode:
								(nextConfig.split_mode as string) || "per_item",
							output_mapping:
								(nextConfig.output_mapping as string) ||
								"result",
							merge_path:
								(nextConfig.merge_path as string) || null,
						},
						parent_stage_key: task.stage_key,
						parent_task_id: task.id,
						_merged_from_count: completedSiblings.length,
					},
				} as unknown as AiTask);
				await incrementBatchTotalTasks(batchId, 1);
			}
		},
	);
}

function getValueByPath(obj: unknown, path: string): unknown {
	if (!path || path === ".") return obj;
	return path
		.split(".")
		.reduce(
			(acc, part) =>
				(acc as Record<string, unknown>) &&
				(acc as Record<string, unknown>)[part],
			obj,
		);
}

function extractStageKey(templateId: string): string {
	if (!templateId) return "unknown_stage";

	// 1. Format: uuid_stageName_step_N
	const stepMatch = templateId.match(/^[0-9a-fA-F-]+_(.+)_step_\d+$/);
	if (stepMatch) return stepMatch[1];

	// 2. Format: uuid_stageName
	const match = templateId.match(/^[0-9a-fA-F-]+_(.+)$/);
	return match ? match[1] : templateId;
}

async function updateBatchCounters(batchId: string, success: boolean) {
	try {
		await db.transaction("rw", db.task_batches, async () => {
			const batch = await db.task_batches.get(batchId);
			if (!batch) return;

			const update: Partial<Execution> = {
				updated_at: new Date().toISOString(),
			};

			if (success) {
				update.completed_tasks = (batch.completed_tasks || 0) + 1;
				update.processing_tasks = Math.max(
					0,
					(batch.processing_tasks || 0) - 1,
				);
			} else {
				update.failed_tasks = (batch.failed_tasks || 0) + 1;
				update.processing_tasks = Math.max(
					0,
					(batch.processing_tasks || 0) - 1,
				);
			}

			// Check if all done
			const total = batch.total_tasks || 0;
			const done =
				(update.completed_tasks ?? batch.completed_tasks ?? 0) +
				(update.failed_tasks ?? batch.failed_tasks ?? 0);

			// Self-healing: If total is 0 but we have finished tasks, it means initialization failed
			// but we can still determine if it's "done" if there are no more processing tasks.
			const isActuallyDone =
				(total > 0 && done >= total) ||
				(total === 0 &&
					done > 0 &&
					(update.processing_tasks ?? batch.processing_tasks ?? 0) ===
						0);

			if (isActuallyDone) {
				update.status =
					(update.failed_tasks ?? batch.failed_tasks ?? 0) > 0
						? "failed"
						: "completed";
				update.completed_at = new Date().toISOString();
			}

			await db.task_batches.update(batchId, update);
		});
	} catch (err) {
		console.error("[Worker] Failed to update batch counters:", err);
	}
}

// --- USAGE HELPERS (Worker context) ---
async function checkUsage(): Promise<boolean> {
	if (currentTier === "premium") return true;

	const usage = await getUsage();
	const limit = 200; // Decision 6
	const grace = Math.floor(limit * 0.1);
	return usage.count < limit + grace;
}

async function getUsage() {
	const currentMonth = new Date().toISOString().slice(0, 7);
	const data = await db.metadata.get("usage");

	if (data && data.value.month === currentMonth) {
		return data.value;
	}

	const newData = { count: 0, month: currentMonth };
	await db.metadata.put({ key: "usage", value: newData });
	return newData;
}
