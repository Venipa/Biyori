import { useSyncExternalStore } from "react";

let filterText = "";
const listeners = new Set<() => void>();

function emit(): void {
	for (const listener of listeners) {
		listener();
	}
}

export function setListFilterText(next: string): void {
	if (filterText === next) {
		return;
	}
	filterText = next;
	emit();
}

export function getListFilterText(): string {
	return filterText;
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function useListFilterText(): string {
	return useSyncExternalStore(subscribe, getListFilterText, getListFilterText);
}
