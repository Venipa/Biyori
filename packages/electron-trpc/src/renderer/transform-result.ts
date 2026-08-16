import type { DataTransformer } from "@trpc/server";
import type { TRPCResponseMessage, TRPCResultMessage } from "@trpc/server/rpc";

export const identityTransformer: DataTransformer = {
	serialize: (data: unknown) => data,
	deserialize: (data: unknown) => data,
};

export function transformResult(
	response: TRPCResponseMessage,
	transformer: DataTransformer,
):
	| { ok: false; error: TRPCResponseMessage }
	| { ok: true; result: TRPCResultMessage<unknown>["result"] } {
	if ("error" in response) {
		return {
			ok: false,
			error: {
				...response,
				error: transformer.deserialize(response.error),
			},
		};
	}

	const result = response.result;
	if (!result.type || result.type === "data") {
		return {
			ok: true,
			result: {
				...result,
				type: "data",
				data: transformer.deserialize(result.data),
			},
		};
	}

	return { ok: true, result };
}
