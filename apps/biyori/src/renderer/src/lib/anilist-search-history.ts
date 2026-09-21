import { useSyncExternalStore } from "react";

const STORAGE_KEY = "biyori.anilist-searches";
const MAX_SEARCHES = 8;

let queries: string[] = readStored();
const listeners = new Set<() => void>();

function readStored(): string[] {
	if (typeof sessionStorage === "undefined") {
		return [];
	}
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return [];
		}
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, MAX_SEARCHES);
	} catch {
		return [];
	}
}

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

export function rememberAnilistSearch(q: string): void {
	const next = q.trim();
	if (!next) {
		return;
	}
	const without = queries.filter((item) => item.toLowerCase() !== next.toLowerCase());
	queries = [next, ...without].slice(0, MAX_SEARCHES);
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
	emit();
}

export function useAnilistSearches(): readonly string[] {
	return useSyncExternalStore(
		subscribe,
		() => queries,
		() => queries,
	);
}
