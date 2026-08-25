import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

type OpenAnimeInfoOptions = {
	id: number;
	infoTab?: "main" | "list";
};

function applyOpenSearch(
	prev: Record<string, unknown>,
	options: OpenAnimeInfoOptions,
): Record<string, unknown> {
	return {
		...prev,
		id: String(options.id),
		infoTab: options.infoTab,
	};
}

export function useAnimeInfoNav() {
	const navigate = useNavigate();

	const open = useCallback(
		(options: OpenAnimeInfoOptions) => {
			void navigate({
				to: ".",
				search: (prev) =>
					applyOpenSearch(prev as Record<string, unknown>, options),
			});
		},
		[navigate],
	);

	const close = useCallback(() => {
		void navigate({
			to: ".",
			search: (prev) => ({
				...prev,
				id: undefined,
				infoTab: undefined,
			}),
		});
	}, [navigate]);

	const navigateTo = useCallback(
		(id: number) => {
			void navigate({
				to: ".",
				search: (prev) => ({
					...prev,
					id: String(id),
				}),
			});
		},
		[navigate],
	);

	return useMemo(
		() => ({ open, close, navigateTo }),
		[open, close, navigateTo],
	);
}
