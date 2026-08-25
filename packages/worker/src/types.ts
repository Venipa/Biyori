export const WORKER_PROTOCOL_VERSION = 1 as const;

export type ProcedureContext<TEvents extends Record<string, unknown> = Record<string, never>> = {
	signal: AbortSignal;
	emit: <K extends keyof TEvents & string>(name: K, data: TEvents[K]) => void;
};

type ProcedureBrand<TInput, TOutput, TEvents extends Record<string, unknown>> = {
	readonly __input: TInput;
	readonly __output: TOutput;
	readonly __events: TEvents;
};

export type Procedure<TInput, TOutput, TEvents extends Record<string, unknown> = Record<string, never>> = ((
	input: TInput,
	ctx: ProcedureContext<TEvents>,
) => TOutput | Promise<TOutput>) &
	ProcedureBrand<TInput, TOutput, TEvents>;

export type ProcedureMap = Record<string, Procedure<unknown, unknown, Record<string, unknown>>>;

export type WorkerServe<TProcedures extends Record<string, unknown>, TEvents extends Record<string, unknown> = Record<string, never>> = {
	readonly procedures: TProcedures;
	readonly events: TEvents;
	broadcast: <K extends keyof TEvents & string>(name: K, data: TEvents[K]) => void;
};

export type InvokeOptions<TEvents extends Record<string, unknown> = Record<string, never>> = {
	signal?: AbortSignal;
	onEvent?: {
		[K in keyof TEvents]?: (data: TEvents[K]) => void;
	};
};

export type InferProcedure<T> =
	T extends Procedure<infer TInput, infer TOutput, infer TEvents>
		? Procedure<TInput, TOutput, TEvents>
		: T extends (input: infer TInput, ctx: ProcedureContext<infer TEvents>) => infer TOutput
			? Procedure<TInput, Awaited<TOutput>, TEvents>
			: never;

export type NormalizeProcedures<T extends Record<string, unknown>> = {
	[K in keyof T]: InferProcedure<T[K]>;
};

type InvokeMap<TProcedures> = {
	[K in keyof TProcedures]: TProcedures[K] extends Procedure<infer TInput, infer TOutput, infer TProcEvents>
		? (input: TInput, opts?: InvokeOptions<TProcEvents>) => Promise<TOutput>
		: TProcedures[K] extends (input: infer TInput, ctx: ProcedureContext<infer TProcEvents>) => infer TOutput
			? (input: TInput, opts?: InvokeOptions<TProcEvents>) => Promise<Awaited<TOutput>>
			: never;
};

type SubscribeMap<TEvents> = {
	[K in keyof TEvents & string]: (listener: (data: TEvents[K]) => void) => () => void;
};

export type WorkerClient<TServe> = {
	invoke: TServe extends { procedures: infer TProcedures } ? InvokeMap<TProcedures> : never;
	subscribe: TServe extends { events: infer TEvents } ? SubscribeMap<TEvents> : SubscribeMap<Record<string, never>>;
	dispose: () => Promise<void>;
};

export type Envelope =
	| {
			v: typeof WORKER_PROTOCOL_VERSION;
			id: number;
			kind: "req";
			method: string;
			payload: unknown;
	  }
	| {
			v: typeof WORKER_PROTOCOL_VERSION;
			id: number;
			kind: "res";
			payload: unknown;
	  }
	| {
			v: typeof WORKER_PROTOCOL_VERSION;
			id: number;
			kind: "err";
			message: string;
			aborted?: boolean;
	  }
	| {
			v: typeof WORKER_PROTOCOL_VERSION;
			id: number;
			kind: "event";
			name: string;
			payload: unknown;
	  }
	| {
			v: typeof WORKER_PROTOCOL_VERSION;
			id: number;
			kind: "abort";
	  }
	| {
			v: typeof WORKER_PROTOCOL_VERSION;
			id: 0;
			kind: "broadcast";
			name: string;
			payload: unknown;
	  };

const KINDS = new Set(["req", "res", "err", "event", "abort", "broadcast"]);

export function isEnvelope(value: unknown): value is Envelope {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const row = value as { v?: unknown; kind?: unknown };
	return row.v === WORKER_PROTOCOL_VERSION && typeof row.kind === "string" && KINDS.has(row.kind);
}

export type MessagePortLike = {
	postMessage: (value: unknown) => void;
	on: (event: "message", listener: (value: unknown) => void) => void;
	off?: (event: "message", listener: (value: unknown) => void) => void;
	start?: () => void;
};
