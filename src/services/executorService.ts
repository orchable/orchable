import { storage, UserTier } from "../lib/storage";
import { WorkerMessage, WorkerStatus } from "../workers/taskExecutor.worker";

class ExecutorService {
	private worker: Worker | null = null;
	private listeners: Set<(status: WorkerStatus) => void> = new Set();
	private isProcessing = false;

	constructor() {
		if (typeof window !== "undefined") {
			this.initWorker();
		}
	}

	private initWorker() {
		try {
			// Use URL constructor for Vite worker support
			this.worker = new Worker(
				new URL("../workers/taskExecutor.worker.ts", import.meta.url),
				{
					type: "module",
				},
			);

			this.worker.onmessage = (e: MessageEvent<WorkerStatus>) => {
				this.listeners.forEach((cb) => cb(e.data));
			};

			this.worker.onerror = (e) => {
				console.error("[ExecutorService] Worker error:", e);
			};
		} catch (err) {
			console.error(
				"[ExecutorService] Failed to initialize worker:",
				err,
			);
		}
	}

	async start(tier: UserTier) {
		const { getExecutionPath } =
			await import("../lib/storage/executionRouter");
		const path = await getExecutionPath(tier);

		console.log(
			`[ExecutorService] Starting for tier: ${tier}, path: ${path}`,
		);

		if (path === "web-worker") {
			if (!this.worker) {
				console.log("[ExecutorService] Initializing new worker...");
				this.initWorker();
			}
			if (this.worker) {
				const { keyPoolService } = await import("./keyPoolService");
				const configs = await keyPoolService.resolveKeys(tier);

				console.log(
					`[ExecutorService] Sending START to worker (${configs.length} keys)`,
				);
				this.worker.postMessage({ type: "START", configs, tier });
				this.isProcessing = true;
			}
		} else {
			// Supabase + n8n path
			console.log("[ExecutorService] Execution routed to Supabase + n8n");
			this.isProcessing = false;
		}
	}

	/**
	 * Ensures the worker is running if there are pending tasks.
	 * Can be called by UI components when they mount.
	 */
	async wakeup(tier: UserTier) {
		if (this.isProcessing) return;

		const { getExecutionPath } =
			await import("../lib/storage/executionRouter");
		const path = await getExecutionPath(tier);

		if (path === "web-worker") {
			const { db } = await import("../lib/storage/IndexedDBAdapter");
			const pending = await db.ai_tasks
				.where("status")
				.equals("plan")
				.count();
			if (pending > 0) {
				console.log(
					`[ExecutorService] Wakeup: ${pending} pending tasks found. Starting worker.`,
				);
				await this.start(tier);
			}
		}
	}

	stop() {
		if (this.worker) {
			this.worker.postMessage({ type: "STOP" });
			this.isProcessing = false;
		}
	}

	subscribe(cb: (status: WorkerStatus) => void) {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	get isActive() {
		return this.isProcessing;
	}

	async getUsage() {
		const db = await import("../lib/storage/IndexedDBAdapter").then(
			(m) => m.db,
		);
		const data = await db.metadata.get("usage");
		return (
			data?.value || {
				count: 0,
				month: new Date().toISOString().slice(0, 7),
			}
		);
	}
}

export const executorService = new ExecutorService();
