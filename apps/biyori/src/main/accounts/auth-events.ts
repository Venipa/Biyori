import type { AccountService } from "../stores/credentials/store";

export type AuthEvent =
	| { phase: "loading"; service: AccountService }
	| { phase: "success"; service: AccountService; username: string }
	| { phase: "error"; service: AccountService; message: string };

const listeners = new Set<(event: AuthEvent) => void>();

/** Login callbacks (deep links) report progress here so the renderer can show it. */
export function emitAuthEvent(event: AuthEvent): void {
	for (const listener of listeners) {
		listener(event);
	}
}

export function subscribeAuthEvents(listener: (event: AuthEvent) => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
