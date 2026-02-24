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

	start(apiKey: string, tier: string = "anonymous") {
		if (!this.worker) this.initWorker();
		if (this.worker) {
			this.worker.postMessage({ type: "START", apiKey, tier });
			this.isProcessing = true;
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
