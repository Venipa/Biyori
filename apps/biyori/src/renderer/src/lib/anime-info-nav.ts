import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { type AnimeInfoFrame, jumpAnimeInfoFrame, pushAnimeInfoFrame, replaceAnimeInfoFrame } from "@/mainview/lib/anime-info-stack";
import { trpc } from "@/mainview/trpc";

type AnimeInfoOpen = AnimeInfoFrame & {
	history: AnimeInfoFrame[];
};

const PREFETCH = { staleTime: 30_000 } as const;

let current: AnimeInfoFrame | undefined;
let stack: AnimeInfoFrame[] = [];
let snapshot: AnimeInfoOpen | undefined;
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
	return snapshot;
}

function applyFrame(next: { stack: AnimeInfoFrame[]; current: AnimeInfoFrame | undefined }): void {
	const same = current?.id === next.current?.id && current?.infoTab === next.current?.infoTab && stack.length === next.stack.length;
	stack = next.stack;
	current = next.current;
	if (same) {
		return;
	}
	snapshot = current ? { ...current, history: stack } : undefined;
	emit();
}

function clearAnimeInfoStore(): void {
	stack = [];
	current = undefined;
	snapshot = undefined;
	emit();
}

function clearSearch(navigate: ReturnType<typeof useNavigate>): void {
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
}

export function useAnimeInfoOpen(): AnimeInfoOpen | undefined {
	return useSyncExternalStore(subscribe, getAnimeInfoOpen, getAnimeInfoOpen);
}

export function useAnimeInfoNav() {
	const navigate = useNavigate();
	const utils = trpc.useUtils();

	const open = useCallback(
		(options: AnimeInfoFrame) => {
			void utils.anime.byId.prefetch({ id: options.id }, PREFETCH);
			applyFrame(replaceAnimeInfoFrame(options));
		},
		[utils],
	);

	const push = useCallback(
		(options: AnimeInfoFrame, from?: Pick<AnimeInfoFrame, "title" | "coverUrl" | "season">) => {
			void utils.anime.byId.prefetch({ id: options.id }, PREFETCH);
			applyFrame(pushAnimeInfoFrame(stack, current, options, from));
		},
		[utils],
	);

	const backTo = useCallback(
		(index: number) => {
			const next = jumpAnimeInfoFrame(stack, index);
			if (next.current) {
				void utils.anime.byId.prefetch({ id: next.current.id }, PREFETCH);
				applyFrame(next);
				return;
			}
			clearAnimeInfoStore();
			clearSearch(navigate);
		},
		[navigate, utils],
	);

	const close = useCallback(() => {
		clearAnimeInfoStore();
		clearSearch(navigate);
	}, [navigate]);

	const navigateTo = useCallback(
		(id: number) => {
			void utils.anime.byId.prefetch({ id }, PREFETCH);
			applyFrame(replaceAnimeInfoFrame({ id, infoTab: current?.infoTab }));
		},
		[utils],
	);

	return useMemo(() => ({ open, push, backTo, close, navigateTo }), [open, push, backTo, close, navigateTo]);
}
