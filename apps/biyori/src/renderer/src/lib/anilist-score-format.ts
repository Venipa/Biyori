import { type AnilistScoreFormat, parseScoreFormat } from "@/lib/anilist-score";
import { trpc } from "@/mainview/trpc";

export function useAnilistScoreFormat(): AnilistScoreFormat {
	const status = trpc.anilist.status.useQuery();
	return parseScoreFormat(status.data?.scoreFormat);
}
