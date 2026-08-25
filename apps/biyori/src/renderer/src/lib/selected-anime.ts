import { useSyncExternalStore } from "react";

import type { ListStatus } from "@/shared/list";

export type SelectedAnime = {
	id: number;
	title: string;
	folder: string;
	episodes: number;
	episodesWatched: number;
	status: ListStatus;
	notes: string;
};

let orderedIds: number[] = [];
let current: SelectedAnime | null = null;
let deleteRequest: SelectedAnime | null = null;

export function setOrderedAnimeIds(ids: number[]): void {
	if (orderedIds.length === ids.length && orderedIds.every((id, index) => id === ids[index])) {
		return;
	}
	orderedIds = ids;
}

export function getNeighborAnimeId(id: number, delta: number): number | null {
	const index = orderedIds.indexOf(id);
	if (index === -1) {
		return null;
	}
	return orderedIds[index + delta] ?? null;
}

const listeners = new Set<() => void>();
const deleteListeners = new Set<() => void>();

function emit(set: Set<() => void>): void {
	for (const listener of set) {
		listener();
	}
}

export function setSelectedAnime(next: SelectedAnime | null): void {
	if (
		current?.id === next?.id &&
		current?.status === next?.status &&
		current?.episodesWatched === next?.episodesWatched &&
		current?.folder === next?.folder &&
		Boolean(current) === Boolean(next)
	) {
		return;
	}
	current = next;
	emit(listeners);
}

export function getSelectedAnime(): SelectedAnime | null {
	return current;
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function useSelectedAnime(): SelectedAnime | null {
	return useSyncExternalStore(subscribe, getSelectedAnime, getSelectedAnime);
}

export function requestAnimeDelete(next: SelectedAnime | null): void {
	deleteRequest = next;
	emit(deleteListeners);
}

export function getAnimeDeleteRequest(): SelectedAnime | null {
	return deleteRequest;
}

function subscribeDelete(listener: () => void): () => void {
	deleteListeners.add(listener);
	return () => {
		deleteListeners.delete(listener);
	};
}

export function useAnimeDeleteRequest(): SelectedAnime | null {
	return useSyncExternalStore(subscribeDelete, getAnimeDeleteRequest, getAnimeDeleteRequest);
}
