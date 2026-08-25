import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useSyncExternalStore } from "react";

type OpenAnimeInfoOptions = {
	id: number;
	infoTab?: "main" | "list";
};

type AnimeInfoOpen = {
	id: number;
	infoTab: "main" | "list" | undefined;
};

let current: AnimeInfoOpen | undefined;
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

function getAnimeInfoOpen(): AnimeInfoOpen | undefined {
	return current;
}

function setAnimeInfoOpen(next: AnimeInfoOpen | undefined): void {
	if (current?.id === next?.id && current?.infoTab === next?.infoTab) {
		return;
	}
	current = next;
	emit();
}

export function useAnimeInfoOpen(): AnimeInfoOpen | undefined {
	return useSyncExternalStore(subscribe, getAnimeInfoOpen, getAnimeInfoOpen);
}

export function useAnimeInfoNav() {
	const navigate = useNavigate();

	const open = useCallback((options: OpenAnimeInfoOptions) => {
		setAnimeInfoOpen({
			id: options.id,
			infoTab: options.infoTab,
		});
	}, []);

	const close = useCallback(() => {
		setAnimeInfoOpen(undefined);
		void navigate({
			to: ".",
			replace: true,
			search: (prev) => {
				if (prev.id == null && prev.infoTab == null) {
					return prev;
				}
				return {
					...prev,
					id: undefined,
					infoTab: undefined,
				};
			},
		});
	}, [navigate]);

	const navigateTo = useCallback((id: number) => {
		setAnimeInfoOpen({
			id,
			infoTab: current?.infoTab,
		});
	}, []);

	return useMemo(() => ({ open, close, navigateTo }), [open, close, navigateTo]);
}
