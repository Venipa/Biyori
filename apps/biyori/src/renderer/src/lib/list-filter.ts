import { startTransition, useSyncExternalStore } from "react";

let filterText = "";
let resetToken = 0;
const listeners = new Set<() => void>();

function emit(): void {
	for (const listener of listeners) {
		listener();
	}
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function setListFilterText(next: string): void {
	if (filterText === next) {
		return;
	}
	filterText = next;
	emit();
}

export function clearListFilterText(): void {
	filterText = "";
	resetToken += 1;
	startTransition(() => {
		emit();
	});
}

export function getListFilterText(): string {
	return filterText;
}

function getResetToken(): number {
	return resetToken;
}

export function useListFilterText(): string {
	return useSyncExternalStore(subscribe, getListFilterText, getListFilterText);
}

export function useListFilterResetToken(): number {
	return useSyncExternalStore(subscribe, getResetToken, getResetToken);
}
