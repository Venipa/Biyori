import { useSyncExternalStore } from "react";

type ActivityPanelState = {
	open: boolean;
	watchConfirmPromoted: boolean;
};

let state: ActivityPanelState = {
	open: false,
	watchConfirmPromoted: false,
};

const listeners = new Set<() => void>();

function emit(): void {
	for (const listener of listeners) {
		listener();
	}
}

export function setActivityPanelOpen(open: boolean): void {
	if (state.open === open) {
		return;
	}
	state = { ...state, open };
	emit();
}

export function toggleActivityPanel(): void {
	state = { ...state, open: !state.open };
	emit();
}

export function promoteWatchConfirm(): void {
	state = { open: true, watchConfirmPromoted: true };
	emit();
}

export function resetWatchConfirmPromoted(): void {
	if (!state.watchConfirmPromoted) {
		return;
	}
	state = { ...state, watchConfirmPromoted: false };
	emit();
}

export function getActivityPanelState(): ActivityPanelState {
	return state;
}

export function subscribeActivityPanel(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function useActivityPanelState(): ActivityPanelState {
	return useSyncExternalStore(subscribeActivityPanel, getActivityPanelState);
}
