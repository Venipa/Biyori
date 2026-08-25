import { Worker, type WorkerOptions } from "node:worker_threads";
import { type Envelope, type InvokeOptions, isEnvelope, type MessagePortLike, WORKER_PROTOCOL_VERSION, type WorkerClient } from "./types";

type Pending = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	onEvent?: InvokeOptions<Record<string, unknown>>["onEvent"];
	onAbort?: () => void;
};

function isWorker(value: unknown): value is Worker {
	return value instanceof Worker;
}

function isPortLike(value: unknown): value is MessagePortLike {
	return typeof value === "object" && value !== null && "postMessage" in value && "on" in value;
}

export function createWorker<TServe>(source: string | URL | Worker | MessagePortLike, options?: WorkerOptions): WorkerClient<TServe> {
	const owned = typeof source === "string" || source instanceof URL;
	const worker = owned ? new Worker(source, options) : isWorker(source) ? source : null;
	const port: MessagePortLike =
		worker ??
		(isPortLike(source)
			? source
			: (() => {
					throw new Error("createWorker expected a path, Worker, or message port");
				})());
	port.start?.();

	let nextId = 1;
	const pending = new Map<number, Pending>();
	const listeners = new Map<string, Set<(data: unknown) => void>>();

	const onMessage = (raw: unknown): void => {
		if (!isEnvelope(raw)) {
			return;
		}
		if (raw.kind === "broadcast") {
			const set = listeners.get(raw.name);
			if (!set) {
				return;
			}
			for (const listener of set) {
				listener(raw.payload);
			}
			return;
		}
		const slot = pending.get(raw.id);
		if (!slot) {
			return;
		}
		if (raw.kind === "event") {
			slot.onEvent?.[raw.name]?.(raw.payload);
			return;
		}
		if (raw.kind === "res") {
			pending.delete(raw.id);
			slot.onAbort?.();
			slot.resolve(raw.payload);
			return;
		}
		if (raw.kind === "err") {
			pending.delete(raw.id);
			slot.onAbort?.();
			if (raw.aborted) {
				slot.reject(abortError());
				return;
			}
			slot.reject(new Error(raw.message));
		}
	};

	port.on("message", onMessage);

	const failAll = (error: Error): void => {
		for (const [id, slot] of pending) {
			pending.delete(id);
			slot.onAbort?.();
			slot.reject(error);
		}
	};

	if (worker) {
		worker.on("error", (error) => {
			failAll(error);
		});
		worker.on("exit", (code) => {
			if (pending.size === 0) {
				return;
			}
			failAll(new Error(`Worker exited with code ${code}`));
		});
	}

	const invoke = new Proxy(
		{},
		{
			get(_target, method: string) {
				return (payload: unknown, opts?: InvokeOptions<Record<string, unknown>>) => {
					const id = nextId++;
					return new Promise((resolve, reject) => {
						const signal = opts?.signal;
						if (signal?.aborted) {
							reject(abortError());
							return;
						}
						const onAbort = (): void => {
							signal?.removeEventListener("abort", onAbort);
							if (!pending.has(id)) {
								return;
							}
							pending.delete(id);
							post(port, {
								v: WORKER_PROTOCOL_VERSION,
								id,
								kind: "abort",
							});
							reject(abortError());
						};
						if (signal) {
							signal.addEventListener("abort", onAbort, { once: true });
						}
						pending.set(id, {
							resolve,
							reject,
							onEvent: opts?.onEvent,
							onAbort: signal ? () => signal.removeEventListener("abort", onAbort) : undefined,
						});
						post(port, {
							v: WORKER_PROTOCOL_VERSION,
							id,
							kind: "req",
							method,
							payload,
						});
					});
				};
			},
		},
	);

	const subscribe = new Proxy(
		{},
		{
			get(_target, name: string) {
				return (listener: (data: unknown) => void) => {
					let set = listeners.get(name);
					if (!set) {
						set = new Set();
						listeners.set(name, set);
					}
					set.add(listener);
					return () => {
						set.delete(listener);
						if (set.size === 0) {
							listeners.delete(name);
						}
					};
				};
			},
		},
	);

	return {
		invoke,
		subscribe,
		dispose: async () => {
			failAll(abortError());
			port.off?.("message", onMessage);
			if (worker) {
				await worker.terminate();
			}
		},
	} as WorkerClient<TServe>;
}

function post(port: MessagePortLike, envelope: Envelope): void {
	port.postMessage(envelope);
}

function abortError(): Error {
	const error = new Error("Aborted");
	error.name = "AbortError";
	return error;
}
