import { TRPCClientError, type TRPCLink } from "@trpc/client";
import type { AnyRouter, DataTransformer } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import type { TRPCResponseMessage } from "@trpc/server/rpc";
import type { RendererGlobalElectronTRPC } from "../types";
import { identityTransformer, transformResult } from "./transform-result";

export type IpcLinkOptions = {
	transformer?: DataTransformer;
};

function getElectronTRPC(): RendererGlobalElectronTRPC {
	const electronTRPC = (
		globalThis as typeof globalThis & {
			electronTRPC?: RendererGlobalElectronTRPC;
		}
	).electronTRPC;

	if (!electronTRPC) {
		throw new Error("Could not find `electronTRPC` global. Check that `exposeElectronTRPC` has been called in your preload file.");
	}

	return electronTRPC;
}

export function ipcLink<TRouter extends AnyRouter>(options: IpcLinkOptions = {}): TRPCLink<TRouter> {
	const transformer = options.transformer ?? identityTransformer;

	return () => {
		const electronTRPC = getElectronTRPC();
		const pending = new Map<
			number | string,
			{
				next: (value: TRPCResponseMessage) => void;
			}
		>();

		electronTRPC.onMessage((response) => {
			if (response.id == null) {
				return;
			}
			pending.get(response.id)?.next(response);
		});

		return ({ op }) => {
			return observable((observer) => {
				let didUnsubscribe = false;

				const handleResponse = (response: TRPCResponseMessage): void => {
					if (didUnsubscribe) {
						return;
					}

					const transformed = transformResult(response, transformer);
					if (!transformed.ok) {
						observer.error(TRPCClientError.from(transformed.error));
						return;
					}

					observer.next({ result: transformed.result });

					if (op.type !== "subscription") {
						observer.complete();
					} else if (transformed.result.type === "stopped") {
						observer.complete();
					}
				};

				pending.set(op.id, { next: handleResponse });

				electronTRPC.sendMessage({
					method: "request",
					operation: {
						...op,
						input: transformer.serialize(op.input),
					},
				});

				return () => {
					didUnsubscribe = true;
					pending.delete(op.id);
					if (op.type === "subscription") {
						electronTRPC.sendMessage({
							id: Number(op.id),
							method: "subscription.stop",
						});
					}
				};
			});
		};
	};
}
