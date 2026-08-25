import { parentPort } from "node:worker_threads";
import {
	type Envelope,
	isEnvelope,
	type MessagePortLike,
	type NormalizeProcedures,
	type Procedure,
	type ProcedureContext,
	type ProcedureMap,
	WORKER_PROTOCOL_VERSION,
	type WorkerServe,
} from "./types";

export function defineProcedure<TInput, TOutput, TEvents extends Record<string, unknown> = Record<string, never>>(
	handler: (input: TInput, ctx: ProcedureContext<TEvents>) => TOutput | Promise<TOutput>,
): Procedure<TInput, TOutput, TEvents> {
	return handler as Procedure<TInput, TOutput, TEvents>;
}

function post(port: MessagePortLike, envelope: Envelope): void {
	port.postMessage(envelope);
}

export function createWorkerServe<
	TProcedures extends Record<string, (input: never, ctx: ProcedureContext<Record<string, never>>) => unknown>,
	TEvents extends Record<string, unknown> = Record<string, never>,
>(
	options: {
		procedures: TProcedures;
		events?: TEvents;
	},
	runtime?: { port?: MessagePortLike },
): WorkerServe<NormalizeProcedures<TProcedures>, TEvents> {
	const port = runtime?.port ?? parentPort;
	if (!port) {
		throw new Error("createWorkerServe must run inside a worker thread");
	}
	port.start?.();

	const procedures = options.procedures as unknown as ProcedureMap;
	const controllers = new Map<number, AbortController>();

	const serve: WorkerServe<NormalizeProcedures<TProcedures>, TEvents> = {
		procedures: options.procedures as unknown as NormalizeProcedures<TProcedures>,
		events: (options.events ?? {}) as TEvents,
		broadcast: (name, data) => {
			post(port, {
				v: WORKER_PROTOCOL_VERSION,
				id: 0,
				kind: "broadcast",
				name,
				payload: data,
			});
		},
	};

	port.on("message", (raw: unknown) => {
		if (!isEnvelope(raw)) {
			return;
		}
		if (raw.kind === "abort") {
			controllers.get(raw.id)?.abort();
			return;
		}
		if (raw.kind !== "req") {
			return;
		}
		void runProcedure(port, procedures, controllers, raw);
	});

	return serve;
}

async function runProcedure(port: MessagePortLike, procedures: ProcedureMap, controllers: Map<number, AbortController>, raw: Extract<Envelope, { kind: "req" }>): Promise<void> {
	const handler = procedures[raw.method];
	if (!handler) {
		post(port, {
			v: WORKER_PROTOCOL_VERSION,
			id: raw.id,
			kind: "err",
			message: `Unknown procedure: ${raw.method}`,
		});
		return;
	}

	const controller = new AbortController();
	controllers.set(raw.id, controller);

	try {
		const result = await handler(raw.payload, {
			signal: controller.signal,
			emit: (name, data) => {
				if (controller.signal.aborted) {
					return;
				}
				post(port, {
					v: WORKER_PROTOCOL_VERSION,
					id: raw.id,
					kind: "event",
					name,
					payload: data,
				});
			},
		});
		if (controller.signal.aborted) {
			return;
		}
		post(port, {
			v: WORKER_PROTOCOL_VERSION,
			id: raw.id,
			kind: "res",
			payload: result,
		});
	} catch (error) {
		if (controller.signal.aborted || isAbortError(error)) {
			post(port, {
				v: WORKER_PROTOCOL_VERSION,
				id: raw.id,
				kind: "err",
				message: "Aborted",
				aborted: true,
			});
			return;
		}
		post(port, {
			v: WORKER_PROTOCOL_VERSION,
			id: raw.id,
			kind: "err",
			message: error instanceof Error ? error.message : String(error),
		});
	} finally {
		controllers.delete(raw.id);
	}
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === "AbortError";
}
