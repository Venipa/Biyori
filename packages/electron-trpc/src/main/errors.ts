import { TRPCError } from "@trpc/server";

export function getTRPCErrorFromUnknown(cause: unknown): TRPCError {
	if (cause instanceof TRPCError) {
		return cause;
	}

	const error = getErrorFromUnknown(cause);
	const trpcError = new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		cause: error,
		message: error.message,
	});
	trpcError.stack = error.stack;
	return trpcError;
}

function getErrorFromUnknown(cause: unknown): Error {
	if (cause instanceof Error) {
		return cause;
	}
	if (typeof cause === "string") {
		return new Error(cause);
	}
	return new Error("Unknown error");
}
