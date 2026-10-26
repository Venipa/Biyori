import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { trpc } from "@/mainview/trpc";

/** Main-window subscriptions: now playing (auto-jump + watched refresh), library index and history flushes. */
export function useAppLiveSync(): void {
	const utils = trpc.useUtils();
	const navigate = useNavigate();
	const lastPlayKey = useRef("");
	const lastProgressRevision = useRef(0);
	trpc.media.onNowPlaying.useSubscription(undefined, {
		onData: (snapshot) => {
			utils.media.nowPlaying.setData(undefined, snapshot);
			if (snapshot.progressRevision > lastProgressRevision.current) {
				lastProgressRevision.current = snapshot.progressRevision;
				void invalidateAnimeQueries(utils, "watched", snapshot.match?.id);
			}
			const settings = utils.settings.get.getData();
			if (!settings || !snapshot.media) {
				lastPlayKey.current = "";
				return;
			}
			const key = `${snapshot.media.player}|${snapshot.media.title}|${snapshot.match?.id ?? "none"}|${snapshot.unrecognized}`;
			if (key === lastPlayKey.current) {
				return;
			}
			lastPlayKey.current = key;
			const goRecognized = Boolean(snapshot.match) && settings.goToNowPlayingOnRecognized;
			const goUnrecognized = snapshot.unrecognized && settings.goToNowPlayingOnUnrecognized;
			if (goRecognized || goUnrecognized) {
				void navigate({ to: "/app/now-playing" });
			}
		},
	});
	trpc.library.onIndex.useSubscription(undefined, {
		onData: () => {
			void Promise.all([utils.anime.listed.invalidate(), utils.anime.list.invalidate(), utils.library.summary.invalidate(), utils.library.episodes.invalidate()]);
		},
	});
	trpc.history.onFlush.useSubscription(undefined, {
		onData: () => {
			void Promise.all([invalidateAnimeQueries(utils, "watched"), utils.anime.byId.invalidate()]);
		},
	});
}
