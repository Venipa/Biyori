import { TRPCError } from "@trpc/server";
import type { AnyRouter, inferRouterContext } from "@trpc/server";
import {
	isObservable,
	observableToAsyncIterable,
} from "@trpc/server/observable";
import type { TRPCResponseMessage } from "@trpc/server/rpc";
import {
	callProcedure,
	getErrorShape,
	isAsyncIterable,
	transformTRPCResponse,
} from "@trpc/server/unstable-core-do-not-import";
import type { IpcMainEvent } from "electron";
import { ELECTRON_TRPC_CHANNEL } from "../constants";
import type { ETRPCRequest } from "../types";
import { getTRPCErrorFromUnknown } from "./errors";
import type { CreateContextOptions } from "./types";

type Awaitable<T> = T | Promise<T>;

export type SubscriptionHandle = {
	unsubscribe: () => void;
};

export async function handleIPCMessage<TRouter extends AnyRouter>({
	router,
	createContext,
	internalId,
	message,
	event,
	subscriptions,
}: {
	router: TRouter;
	createContext?: (
		opts: CreateContextOptions,
	) => Awaitable<inferRouterContext<TRouter>>;
	internalId: string;
	message: ETRPCRequest;
	event: IpcMainEvent;
	subscriptions: Map<string, SubscriptionHandle>;
}): Promise<void> {
	if (message.method === "subscription.stop") {
		const subscription = subscriptions.get(internalId);
		if (!subscription) {
			return;
		}
		subscription.unsubscribe();
		subscriptions.delete(internalId);
		return;
	}

	const { type, input: serializedInput, path, id } = message.operation;
	const input = serializedInput
		? router._def._config.transformer.input.deserialize(serializedInput)
		: undefined;

	const ctx = (await createContext?.({ event })) ?? {};

	const respond = (response: TRPCResponseMessage): void => {
		if (event.sender.isDestroyed()) {
			return;
		}
		event.reply(
			ELECTRON_TRPC_CHANNEL,
			transformTRPCResponse(router._def._config, response),
		);
	};

	const buildErrorResponse = async (cause: unknown): Promise<TRPCResponseMessage> => {
		const error = getTRPCErrorFromUnknown(cause);
		return {
			id,
			error: getErrorShape({
				config: router._def._config,
				error,
				type,
				path,
				input,
				ctx,
			}),
		};
	};

	try {
		const abortController = new AbortController();
		const result = await callProcedure({
			router,
			path,
			getRawInput: async () => input,
			ctx,
			type,
			signal: abortController.signal,
			batchIndex: 0,
		});

		if (type !== "subscription") {
			if (isAsyncIterable(result) || isObservable(result)) {
				throw new TRPCError({
					code: "UNSUPPORTED_MEDIA_TYPE",
					message: `Cannot return an async iterable or observable from a ${type} procedure over Electron IPC`,
				});
			}
			respond({
				id,
				result: {
					type: "data",
					data: result,
				},
			});
			return;
		}

		const isIterableResult = isAsyncIterable(result) || isObservable(result);
		if (!isIterableResult) {
			throw new TRPCError({
				message: `Subscription ${path} did not return an observable or a AsyncGenerator`,
				code: "INTERNAL_SERVER_ERROR",
			});
		}

		const iterable = isObservable(result)
			? observableToAsyncIterable(result, abortController.signal)
			: result;

		subscriptions.set(internalId, {
			unsubscribe: () => abortController.abort(),
		});

		void (async () => {
			try {
				for await (const data of iterable) {
					if (abortController.signal.aborted) {
						break;
					}
					respond({
						id,
						result: {
							type: "data",
							data,
						},
					});
				}
				if (!abortController.signal.aborted) {
					respond({
						id,
						result: {
							type: "stopped",
						},
					});
				}
			} catch (cause) {
				if (abortController.signal.aborted) {
					return;
				}
				respond(await buildErrorResponse(cause));
			} finally {
				subscriptions.delete(internalId);
			}
		})();
	} catch (cause) {
		respond(await buildErrorResponse(cause));
	}
}
