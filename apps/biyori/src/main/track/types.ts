import type { DefaultService } from "../../lib/schemas/app-settings";
import type { Anime, ListEntry } from "../db/types";

export type NowPlayingMedia = {
	player: string;
	windowId: string;
	title: string | null;
	filePath: string | null;
	url: string | null;
	foreground: boolean;
};

export type ParsedPlayback = {
	title: string;
	episode: number | null;
	group: string | null;
	filePath: string | null;
};

export type MatchedAnime = Pick<
	Anime,
	| "id"
	| "title"
	| "alternativeTitles"
	| "type"
	| "coverUrl"
	| "bannerUrl"
	| "episodes"
	| "folder"
	| "fansub"
	| "lastAiredEpisode"
	| "airingStatus"
	| "season"
	| "averageScore"
	| "synopsis"
> &
	Pick<
		ListEntry,
		| "episodesWatched"
		| "status"
		| "score"
		| "notes"
		| "timesRewatched"
		| "dateStarted"
		| "dateCompleted"
	> & {
		rewatching: boolean;
		genres: string[];
		producers: string[];
	};

export type PendingConfirm = {
	animeId: number;
	title: string;
	episode: number;
};

export type NowPlayingUser = {
	name: string;
	provider: DefaultService;
};

export type NowPlayingSnapshot = {
	media: NowPlayingMedia | null;
	parsed: ParsedPlayback | null;
	match: MatchedAnime | null;
	unrecognized: boolean;
	delayRemainingSeconds: number;
	pendingConfirm: PendingConfirm | null;
	startedAt: number | null;
	progressRevision: number;
	user: NowPlayingUser;
};
