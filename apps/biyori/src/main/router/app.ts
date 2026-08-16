import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { parseJsonArray } from "../../lib/parse-json-array";
import {
  type AppSettings,
  appSettingsSchema,
} from "../../lib/schemas/app-settings";
import { listStatusSchema } from "../../shared/list";
import { readAnilistAuth } from "../anilist/store";
import { ensureAnimeCached } from "../anilist/sync";
import { anime, episodeFile, history, listEntry, syncQueue } from "../db/schema";
import { getAppNotice, subscribeAppNotice } from "../notice";
import { loadAppSettings, saveAppSettings } from "../settings";
import { checkTorrents, discardAnimeFilter, discardTorrent, downloadTorrent, getTorrentItems, searchTorrents } from "../torrents";
import {
  listEpisodes,
  playEpisode,
  playNext,
  playRandom,
  scanLibrary,
} from "../track/library";
import { countQueued } from "../track/queue";
import {
  confirmPendingUpdate,
  getNowPlayingSnapshot,
  nowPlayingObservable,
  skipPendingUpdate,
} from "../track/tracker";
import { t } from "../trpc";
import { anilistRouter } from "./anilist";
import { coversRouter } from "./covers";
import { updaterRouter } from "./updater";
import { desktopRouter } from "./desktop";

async function loadAnimeDetail(
	db: Pick<import("../db").DatabaseClient, "select">,
	id: number,
) {
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
	anime: t.router({
		list: t.procedure
			.input(z.object({ status: listStatusSchema }))
			.query(async ({ ctx, input }) => {
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

				const availableRows = await ctx.db
					.select({
						animeId: episodeFile.animeId,
						availableEpisode: max(episodeFile.episode),
					})
					.from(episodeFile)
					.groupBy(episodeFile.animeId);
				const availableById = new Map(
					availableRows.map((row) => [
						row.animeId,
						row.availableEpisode ?? 0,
					]),
				);

				return rows.map((row) => ({
					...row,
					availableEpisode: availableById.get(row.id) ?? 0,
				}));
			}),
		counts: t.procedure.query(async ({ ctx }) => {
			const rows = await ctx.db
				.select({ status: listEntry.status })
				.from(listEntry);
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
					status: listEntry.status,
				})
				.from(anime)
				.innerJoin(listEntry, eq(listEntry.animeId, anime.id));
		}),
		byId: t.procedure
			.input(z.object({ id: z.number().int() }))
			.query(async ({ ctx, input }) => {
				return loadAnimeDetail(ctx.db, input.id);
			}),
		ensure: t.procedure
			.input(z.object({ id: z.number().int() }))
			.mutation(async ({ ctx, input, signal }) => {
				try {
					const auth = await readAnilistAuth(ctx.db);
					const settings = await loadAppSettings(ctx.db);
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
						message:
							error instanceof Error ? error.message : "Could not cache anime",
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
				await ctx.db
					.update(anime)
					.set({ fansub: input.fansub.trim() })
					.where(eq(anime.id, input.id));
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
		remove: t.procedure
			.input(z.object({ id: z.number().int() }))
			.mutation(async ({ ctx, input }) => {
				await ctx.db
					.delete(episodeFile)
					.where(eq(episodeFile.animeId, input.id));
				await ctx.db
					.delete(syncQueue)
					.where(eq(syncQueue.animeId, input.id));
				await ctx.db
					.delete(listEntry)
					.where(eq(listEntry.animeId, input.id));
				return { ok: true as const };
			}),
	}),
	history: t.router({
		list: t.procedure.query(async ({ ctx }) => {
			const rows = await ctx.db
				.select()
				.from(history)
				.orderBy(desc(history.lastModified));
			return {
				queued: rows.filter((row) => row.kind === "queued"),
				history: rows.filter((row) => row.kind === "history"),
			};
		}),
		queuedCount: t.procedure.query(async ({ ctx }) => {
			return countQueued(ctx.db);
		}),
	}),
	statistics: t.router({
		summary: t.procedure.query(async ({ ctx }) => {
			const entries = await ctx.db.select().from(listEntry);
			const animeCount = entries.length;
			const episodeCount = entries.reduce(
				(sum, entry) => sum + entry.episodesWatched,
				0,
			);
			const scored = entries.filter((entry) => entry.score != null);
			const meanScore =
				scored.length === 0
					? 0
					: scored.reduce((sum, entry) => sum + (entry.score ?? 0), 0) /
						scored.length;
			const minutes = episodeCount * 24;
			const days = Math.floor(minutes / (60 * 24));
			const hours = Math.floor((minutes % (60 * 24)) / 60);
			const mins = minutes % 60;

			return {
				animeCount,
				episodeCount,
				timeSpentWatching: `${days} days ${hours} hours ${mins} minutes`,
				meanScore: Number(meanScore.toFixed(2)),
				localAnimeCount: animeCount,
			};
		}),
	}),
	settings: t.router({
		get: t.procedure.query(async ({ ctx }) => {
			return loadAppSettings(ctx.db);
		}),
		set: t.procedure.input(appSettingsSchema).mutation(async ({ ctx, input }) => {
			await saveAppSettings(ctx.db, input);
			return input;
		}),
		addLibraryFolder: t.procedure
			.input(z.object({ path: z.string().min(1) }))
			.mutation(async ({ ctx, input }) => {
				const current = await loadAppSettings(ctx.db);
				if (current.libraryFolders.some((folder) => folder.path === input.path)) {
					return current;
				}
				const next: AppSettings = {
					...current,
					libraryFolders: [...current.libraryFolders, { path: input.path }],
				};
				await saveAppSettings(ctx.db, next);
				return next;
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
		episodes: t.procedure
			.input(z.object({ animeId: z.number().int() }))
			.query(async ({ ctx, input }) => {
				return listEpisodes(ctx.db, input.animeId);
			}),
		playEpisode: t.procedure
			.input(z.object({ animeId: z.number().int(), episode: z.number().int() }))
			.mutation(async ({ ctx, input }) => {
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
		playRandom: t.procedure
			.input(z.object({ animeId: z.number().int() }))
			.mutation(async ({ ctx, input }) => {
				return playRandom(ctx.db, input.animeId);
			}),
	}),
	torrents: t.router({
		list: t.procedure.query(() => getTorrentItems()),
		refresh: t.procedure.mutation(async ({ ctx }) => {
			return checkTorrents(ctx.db, true);
		}),
		search: t.procedure
			.input(z.object({ title: z.string().min(1) }))
			.mutation(async ({ ctx, input }) => {
				return searchTorrents(input.title, ctx.db);
			}),
		download: t.procedure
			.input(z.object({ guid: z.string().min(1) }))
			.mutation(async ({ ctx, input }) => {
				await downloadTorrent(input.guid, ctx.db);
				return { ok: true as const };
			}),
		discard: t.procedure
			.input(z.object({ guid: z.string().min(1) }))
			.mutation(({ input }) => {
				return discardTorrent(input.guid);
			}),
		discardAnime: t.procedure
			.input(z.object({ animeId: z.number().int() }))
			.mutation(async ({ ctx, input }) => {
				return discardAnimeFilter(input.animeId, ctx.db);
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
	anilist: anilistRouter,
	covers: coversRouter,
	updater: updaterRouter,
	desktop: desktopRouter,
});

export type AppRouter = typeof appRouter;
