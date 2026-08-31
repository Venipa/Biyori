import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { folderPathExists, normalizeFolderPath } from "../../lib/folder-path";
import { parseJsonArray } from "../../lib/parse-json-array";
import { settingsFormPatchSchema } from "../../lib/schemas/app-settings";
import { listStatusSchema } from "../../shared/list";
import { readAnilistAuth } from "../anilist/store";
import { ensureAnimeCached } from "../anilist/sync";
import { anime, episodeFile, history, listEntry, syncQueue } from "../db/schema";
import type { Anime } from "../db/types";
import { getActivitySnapshot, subscribeActivity } from "../activity";
import { getAppNotice, subscribeAppNotice } from "../notice";
import { loadAppSettings, loadSettingsFormValues, patchAppSettings, patchSettingsForm } from "../settings";
import { loadStatistics } from "../statistics";
import {
	applyTorrentView,
	checkTorrents,
	discardAnimeFilter,
	discardTorrent,
	downloadSelectedTorrents,
	downloadTorrent,
	getTorrentItems,
	preferFansubFilter,
	searchTorrents,
	subscribeTorrentItems,
} from "../torrents";
import { hanaVersion } from "../track/hana-client";
import { listEpisodes, playEpisode, playNext, playRandom, scanLibrary } from "../track/library";
import { countQueued } from "../track/queue";
import { confirmPendingUpdate, getNowPlayingSnapshot, nowPlayingObservable, skipPendingUpdate } from "../track/tracker";
import { t } from "../trpc";
import { anilistRouter } from "./anilist";
import { coversRouter } from "./covers";
import { desktopRouter } from "./desktop";
import { updaterRouter } from "./updater";

type AnimeDetail = Omit<Anime, "durationMinutes" | "genres" | "producers"> & {
	genres: string[];
	producers: string[];
	episodesWatched: number;
	score: number | null;
	status: string | null;
	started: string | null;
	completed: string | null;
	lastUpdated: string;
	timesRewatched: number;
	rewatching: boolean;
	notes: string;
	dateStarted: string | null;
	dateCompleted: string | null;
	onList: boolean;
};

async function loadAnimeDetail(db: Pick<import("../db").DatabaseClient, "select">, id: number): Promise<AnimeDetail | null> {
	const rows = await db
		.select({
			id: anime.id,
			title: anime.title,
			alternativeTitles: anime.alternativeTitles,
			type: anime.type,
			episodes: anime.episodes,
			averageScore: anime.averageScore,
			season: anime.season,
			airingStatus: anime.airingStatus,
			genres: anime.genres,
			producers: anime.producers,
			synopsis: anime.synopsis,
			folder: anime.folder,
			fansub: anime.fansub,
			lastAiredEpisode: anime.lastAiredEpisode,
			coverUrl: anime.coverUrl,
			bannerUrl: anime.bannerUrl,
			episodesWatched: listEntry.episodesWatched,
			score: listEntry.score,
			status: listEntry.status,
			started: listEntry.started,
			completed: listEntry.completed,
			lastUpdated: listEntry.lastUpdated,
			timesRewatched: listEntry.timesRewatched,
			rewatching: listEntry.rewatching,
			notes: listEntry.notes,
			dateStarted: listEntry.dateStarted,
			dateCompleted: listEntry.dateCompleted,
		})
		.from(anime)
		.leftJoin(listEntry, eq(listEntry.animeId, anime.id))
		.where(eq(anime.id, id))
		.limit(1);

	const row = rows[0];
	if (!row) {
		return null;
	}

	const onList = row.status != null;

	return {
		...row,
		genres: parseJsonArray(row.genres),
		producers: parseJsonArray(row.producers),
		episodesWatched: row.episodesWatched ?? 0,
		score: row.score,
		status: row.status,
		started: row.started,
		completed: row.completed,
		lastUpdated: row.lastUpdated ?? new Date(0).toISOString(),
		timesRewatched: row.timesRewatched ?? 0,
		rewatching: row.rewatching === 1,
		notes: row.notes ?? "",
		dateStarted: row.dateStarted,
		dateCompleted: row.dateCompleted,
		onList,
	};
}

export const appRouter = t.router({
	about: t.procedure.query(() => ({
		hanaVersion,
	})),
	anime: t.router({
		list: t.procedure.input(z.object({ status: listStatusSchema })).query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select({
					id: anime.id,
					title: anime.title,
					alternativeTitles: anime.alternativeTitles,
					type: anime.type,
					episodes: anime.episodes,
					averageScore: anime.averageScore,
					season: anime.season,
					airingStatus: anime.airingStatus,
					genres: anime.genres,
					episodesWatched: listEntry.episodesWatched,
					score: listEntry.score,
					started: listEntry.started,
					completed: listEntry.completed,
					lastUpdated: listEntry.lastUpdated,
					status: listEntry.status,
					notes: listEntry.notes,
					folder: anime.folder,
					fansub: anime.fansub,
					lastAiredEpisode: anime.lastAiredEpisode,
				})
				.from(listEntry)
				.innerJoin(anime, eq(listEntry.animeId, anime.id))
				.where(eq(listEntry.status, input.status))
				.orderBy(desc(listEntry.lastUpdated));

			const episodeRows = await ctx.db.select({ animeId: episodeFile.animeId, episode: episodeFile.episode }).from(episodeFile);
			const libraryById = new Map<number, Set<number>>();
			for (const file of episodeRows) {
				const episodes = libraryById.get(file.animeId);
				if (episodes) {
					episodes.add(file.episode);
					continue;
				}
				libraryById.set(file.animeId, new Set([file.episode]));
			}

			return rows.map((row) => {
				const libraryEpisodes = [...(libraryById.get(row.id) ?? [])];
				return {
					...row,
					libraryEpisodes,
					availableEpisode: libraryEpisodes.length > 0 ? Math.max(...libraryEpisodes) : 0,
				};
			});
		}),
		counts: t.procedure.query(async ({ ctx }) => {
			const rows = await ctx.db.select({ status: listEntry.status }).from(listEntry);
			const counts: Record<string, number> = {
				"Currently watching": 0,
				Completed: 0,
				"On hold": 0,
				Dropped: 0,
				"Plan to watch": 0,
			};
			for (const row of rows) {
				counts[row.status] = (counts[row.status] ?? 0) + 1;
			}
			return counts;
		}),
		listed: t.procedure.query(async ({ ctx }) => {
			return ctx.db
				.select({
					id: anime.id,
					title: anime.title,
					status: listEntry.status,
					airingStatus: anime.airingStatus,
				})
				.from(anime)
				.innerJoin(listEntry, eq(listEntry.animeId, anime.id));
		}),
		byId: t.procedure.input(z.object({ id: z.number().int() })).query(async ({ ctx, input }) => {
			return loadAnimeDetail(ctx.db, input.id);
		}),
		ensure: t.procedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input, signal }) => {
			try {
				const auth = readAnilistAuth();
				const settings = loadAppSettings();
				const { id } = await ensureAnimeCached({
					db: ctx.db,
					id: input.id,
					token: auth?.accessToken,
					titleLanguage: settings.titleLanguage,
					signal,
				});
				const detail = await loadAnimeDetail(ctx.db, id);
				if (!detail) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Anime cache write failed",
					});
				}
				return detail;
			} catch (error) {
				if (error instanceof TRPCError) {
					throw error;
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error instanceof Error ? error.message : "Could not cache anime",
				});
			}
		}),
		setFansub: t.procedure
			.input(
				z.object({
					id: z.number().int(),
					fansub: z.string(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				await ctx.db.update(anime).set({ fansub: input.fansub.trim() }).where(eq(anime.id, input.id));
				return { ok: true as const };
			}),
		setLocal: t.procedure
			.input(
				z.object({
					id: z.number().int(),
					folder: z.string(),
					fansub: z.string(),
					alternativeTitles: z.string(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				await ctx.db
					.update(anime)
					.set({
						folder: input.folder.trim(),
						fansub: input.fansub.trim(),
						alternativeTitles: input.alternativeTitles.trim(),
					})
					.where(eq(anime.id, input.id));
				return { ok: true as const };
			}),
		remove: t.procedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
			await ctx.db.delete(episodeFile).where(eq(episodeFile.animeId, input.id));
			await ctx.db.delete(syncQueue).where(eq(syncQueue.animeId, input.id));
			await ctx.db.delete(listEntry).where(eq(listEntry.animeId, input.id));
			return { ok: true as const };
		}),
	}),
	history: t.router({
		list: t.procedure.query(async ({ ctx }) => {
			const rows = await ctx.db.select().from(history).orderBy(desc(history.lastModified));
			return {
				queued: rows.filter((row) => row.kind === "queued"),
				history: rows.filter((row) => row.kind === "history"),
			};
		}),
		queuedCount: t.procedure.query(async ({ ctx }) => {
			return countQueued(ctx.db);
		}),
		remove: t.procedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
			const rows = await ctx.db.select().from(history).where(eq(history.id, input.id)).limit(1);
			const row = rows[0];
			if (!row) {
				return { ok: true as const };
			}
			if (row.kind === "queued") {
				await ctx.db.delete(syncQueue).where(eq(syncQueue.animeId, row.animeId));
			}
			await ctx.db.delete(history).where(eq(history.id, input.id));
			return { ok: true as const };
		}),
		clear: t.procedure.input(z.object({ kind: z.enum(["history", "queued"]) })).mutation(async ({ ctx, input }) => {
			if (input.kind === "queued") {
				await ctx.db.delete(syncQueue);
			}
			await ctx.db.delete(history).where(eq(history.kind, input.kind));
			return { ok: true as const };
		}),
	}),
	statistics: t.router({
		summary: t.procedure.query(async ({ ctx }) => loadStatistics(ctx.db)),
	}),
	settings: t.router({
		get: t.procedure.query(() => {
			return loadSettingsFormValues();
		}),
		set: t.procedure.input(settingsFormPatchSchema).mutation(({ input }) => {
			return patchSettingsForm(input);
		}),
		addLibraryFolder: t.procedure.input(z.object({ path: z.string().min(1) })).mutation(({ input }) => {
			const path = normalizeFolderPath(input.path);
			const current = loadAppSettings();
			if (folderPathExists(current.libraryFolders, path)) {
				return loadSettingsFormValues();
			}
			patchAppSettings({
				libraryFolders: [...current.libraryFolders, { path }],
			});
			return loadSettingsFormValues();
		}),
	}),
	media: t.router({
		nowPlaying: t.procedure.query(() => getNowPlayingSnapshot()),
		onNowPlaying: t.procedure.subscription(() => nowPlayingObservable()),
		confirmUpdate: t.procedure.mutation(async () => {
			await confirmPendingUpdate();
			return { ok: true as const };
		}),
		skipUpdate: t.procedure.mutation(async () => {
			await skipPendingUpdate();
			return { ok: true as const };
		}),
	}),
	library: t.router({
		scan: t.procedure.mutation(async ({ ctx }) => {
			return scanLibrary(ctx.db);
		}),
		episodes: t.procedure.input(z.object({ animeId: z.number().int() })).query(async ({ ctx, input }) => {
			return listEpisodes(ctx.db, input.animeId);
		}),
		playEpisode: t.procedure.input(z.object({ animeId: z.number().int(), episode: z.number().int() })).mutation(async ({ ctx, input }) => {
			return playEpisode(ctx.db, input.animeId, input.episode);
		}),
		playNext: t.procedure
			.input(
				z.object({
					animeId: z.number().int(),
					episodesWatched: z.number().int(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				return playNext(ctx.db, input.animeId, input.episodesWatched);
			}),
		playRandom: t.procedure.input(z.object({ animeId: z.number().int() })).mutation(async ({ ctx, input }) => {
			return playRandom(ctx.db, input.animeId);
		}),
	}),
	torrents: t.router({
		list: t.procedure.query(async ({ ctx }) => {
			return applyTorrentView(ctx.db);
		}),
		onList: t.procedure.subscription(() => {
			return observable<ReturnType<typeof getTorrentItems>>((emit) => {
				emit.next(getTorrentItems());
				return subscribeTorrentItems((next) => {
					emit.next(next);
				});
			});
		}),
		refresh: t.procedure.mutation(async ({ ctx }) => {
			return checkTorrents(ctx.db, true);
		}),
		search: t.procedure.input(z.object({ title: z.string().min(1) })).mutation(async ({ ctx, input }) => {
			return searchTorrents(input.title, ctx.db);
		}),
		download: t.procedure.input(z.object({ guid: z.string().min(1) })).mutation(async ({ ctx, input }) => {
			await downloadTorrent(input.guid, ctx.db);
			return { ok: true as const };
		}),
		downloadMarked: t.procedure.input(z.object({ guids: z.array(z.string().min(1)) })).mutation(async ({ ctx, input }) => {
			await downloadSelectedTorrents(input.guids, ctx.db);
			return { ok: true as const };
		}),
		discard: t.procedure.input(z.object({ guid: z.string().min(1) })).mutation(({ input }) => {
			return discardTorrent(input.guid);
		}),
		discardAnime: t.procedure
			.input(
				z.object({
					animeId: z.number().int(),
					title: z.string(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				return discardAnimeFilter(input.animeId, input.title, ctx.db);
			}),
		preferFansub: t.procedure
			.input(
				z.object({
					animeId: z.number().int(),
					group: z.string().min(1),
					title: z.string(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				return preferFansubFilter(input.animeId, input.group, input.title, ctx.db);
			}),
	}),
	notice: t.router({
		current: t.procedure.query(() => getAppNotice()),
		onNotice: t.procedure.subscription(() => {
			return observable<ReturnType<typeof getAppNotice>>((emit) => {
				emit.next(getAppNotice());
				return subscribeAppNotice((next) => {
					emit.next(next);
				});
			});
		}),
	}),
	activity: t.router({
		snapshot: t.procedure.query(() => getActivitySnapshot()),
		onChange: t.procedure.subscription(() => {
			return observable<ReturnType<typeof getActivitySnapshot>>((emit) => {
				emit.next(getActivitySnapshot());
				return subscribeActivity((next) => {
					emit.next(next);
				});
			});
		}),
	}),
	anilist: anilistRouter,
	covers: coversRouter,
	updater: updaterRouter,
	desktop: desktopRouter,
});

export type AppRouter = typeof appRouter;
