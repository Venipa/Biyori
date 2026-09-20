export type AnimeInfoFrame = {
	id: number;
	infoTab: "main" | "list" | undefined;
	title?: string;
	coverUrl?: string;
	season?: string;
	viaRelation?: string;
};

export function replaceAnimeInfoFrame(next: AnimeInfoFrame): { stack: AnimeInfoFrame[]; current: AnimeInfoFrame } {
	return { stack: [], current: next };
}

export function pushAnimeInfoFrame(
	stack: AnimeInfoFrame[],
	current: AnimeInfoFrame | undefined,
	next: AnimeInfoFrame,
	from?: Pick<AnimeInfoFrame, "title" | "coverUrl" | "season">,
): { stack: AnimeInfoFrame[]; current: AnimeInfoFrame } {
	if (!current || current.id === next.id) {
		return { stack, current: current?.id === next.id ? next : (current ?? next) };
	}
	return {
		stack: [
			...stack,
			{
				...current,
				title: from?.title ?? current.title,
				coverUrl: from?.coverUrl ?? current.coverUrl,
				season: from?.season ?? current.season,
				viaRelation: next.viaRelation ?? current.viaRelation,
			},
		],
		current: next,
	};
}

export function jumpAnimeInfoFrame(stack: AnimeInfoFrame[], index: number): { stack: AnimeInfoFrame[]; current: AnimeInfoFrame | undefined } {
	const frame = stack[index];
	if (!frame) {
		return { stack, current: undefined };
	}
	return { stack: stack.slice(0, index), current: frame };
}
