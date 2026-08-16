import { describe, expect, test } from "bun:test";
import { MessageChannel } from "node:worker_threads";
import { createWorker } from "./client";
import { createWorkerServe, defineProcedure } from "./serve";

function pair<
	TServe extends ReturnType<typeof createWorkerServe>,
>(serveFactory: (port: MessageChannel["port2"]) => TServe) {
	const { port1, port2 } = new MessageChannel();
	port1.start();
	port2.start();
	const server = serveFactory(port2);
	const client = createWorker<typeof server>(port1);
	return { client, server, dispose: () => client.dispose() };
}

describe("worker rpc", () => {
	test("invoke returns result", async () => {
		const { client, dispose } = pair((port) =>
			createWorkerServe(
				{
					procedures: {
						add: defineProcedure((input: { a: number; b: number }) => input.a + input.b),
					},
				},
				{ port },
			),
		);
		try {
			expect(await client.invoke.add({ a: 2, b: 3 })).toBe(5);
		} finally {
			await dispose();
		}
	});

	test("procedure events", async () => {
		const { client, dispose } = pair((port) =>
			createWorkerServe(
				{
					procedures: {
						run: defineProcedure<void, string, { progress: number }>(
							async (_input, ctx) => {
								ctx.emit("progress", 1);
								ctx.emit("progress", 2);
								return "ok";
							},
						),
					},
				},
				{ port },
			),
		);
		try {
			const ticks: number[] = [];
			const result = await client.invoke.run(undefined, {
				onEvent: {
					progress: (value) => {
						ticks.push(value);
					},
				},
			});
			expect(result).toBe("ok");
			expect(ticks).toEqual([1, 2]);
		} finally {
			await dispose();
		}
	});

	test("broadcast subscribe", async () => {
		const { client, server, dispose } = pair((port) =>
			createWorkerServe(
				{
					procedures: {
						ping: defineProcedure(() => "pong"),
					},
					events: {} as { tick: number },
				},
				{ port },
			),
		);
		try {
			const ticks: number[] = [];
			const stop = client.subscribe.tick((value) => {
				ticks.push(value);
			});
			server.broadcast("tick", 7);
			await client.invoke.ping(undefined);
			expect(ticks).toEqual([7]);
			stop();
			server.broadcast("tick", 8);
			await client.invoke.ping(undefined);
			expect(ticks).toEqual([7]);
		} finally {
			await dispose();
		}
	});

	test("abort in-flight invoke", async () => {
		const { client, dispose } = pair((port) =>
			createWorkerServe(
				{
					procedures: {
						hang: defineProcedure(
							(_input: void, ctx) =>
								new Promise<never>((_resolve, reject) => {
									ctx.signal.addEventListener("abort", () => {
										const error = new Error("Aborted");
										error.name = "AbortError";
										reject(error);
									});
								}),
						),
					},
				},
				{ port },
			),
		);
		try {
			const controller = new AbortController();
			const pending = client.invoke.hang(undefined, { signal: controller.signal });
			controller.abort();
			await expect(pending).rejects.toMatchObject({ name: "AbortError" });
		} finally {
			await dispose();
		}
	});

	test("unknown procedure", async () => {
		const { client, dispose } = pair((port) =>
			createWorkerServe({ procedures: {} }, { port }),
		);
		try {
			await expect(
				(client.invoke as { missing: (input: unknown) => Promise<unknown> }).missing(
					null,
				),
			).rejects.toThrow("Unknown procedure: missing");
		} finally {
			await dispose();
		}
	});
});
