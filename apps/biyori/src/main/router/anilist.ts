import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { anilistSearchSchema } from "../../lib/schemas/anilist-search";
import { anilistTokenSchema } from "../../lib/schemas/anilist-token";
import { animeListEntrySchema } from "../../lib/schemas/anime-list-entry";
import { listStatusSchema } from "../../shared/list";
import { AnilistApiError } from "../anilist/client";
import { toAnilistStatus } from "../anilist/map";
import {
  clearAnilistLoginError,
  expiresAtFromToken,
  getAnilistClientId,
  getAnilistLoginError,
  normalizeAnilistToken,
  openAnilistLogin,
  setAnilistLoginError,
} from "../anilist/oauth";
import {
  clearAnilistAuth,
  readAnilistAuth,
  toPublicStatus,
  writeAnilistAuth,
} from "../anilist/store";
import {
  fetchSeasonMedia,
  fetchViewer,
  saveMediaListEntry,
  searchAniListMedia,
  upsertMediaList,
} from "../anilist/sync";
import { anime, listEntry } from "../db/schema";
import { loadAppSettings } from "../settings";
import {
  abortAniListSync,
  getSyncSnapshot,
  requestAniListSync,
  subscribeSyncStatus,
} from "../sync";
import { enqueueUpdate } from "../track/queue";
import { t } from "../trpc";

function mapAnilistError(error: unknown): never {
	if (error instanceof TRPCError) {
		throw error;
	}
	if (error instanceof AnilistApiError) {
		throw new TRPCError({
			code: error.status === 401 ? "UNAUTHORIZED" : "BAD_REQUEST",
			message: error.message,
		});
	}
	if (error instanceof Error) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: error.message,
		});
	}
	throw new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "AniList request failed",
	});
}

async function requireAuth(db: Parameters<typeof readAnilistAuth>[0]) {
	const auth = await readAnilistAuth(db);
	if (!auth || auth.expiresAt <= Date.now()) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "AniList is not connected",
		});
	}
	return auth;
}

export const anilistRouter = t.router({
	status: t.procedure.query(async ({ ctx }) => {
		const auth = await readAnilistAuth(ctx.db);
		return {
			...toPublicStatus(auth),
			loginError: getAnilistLoginError(),
		};
	}),
	authorize: t.procedure.mutation(() => {
		if (!getAnilistClientId()) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "VITE_ANILIST_CLIENT_ID is not set",
			});
		}
		clearAnilistLoginError();
		try {
			return openAnilistLogin();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Could not open AniList login";
			setAnilistLoginError(message);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message,
			});
		}
	}),
	connectWithToken: t.procedure
		.input(anilistTokenSchema)
		.mutation(async ({ ctx, input }) => {
			clearAnilistLoginError();
			const token = normalizeAnilistToken(input.token);
			try {
				const viewer = await fetchViewer(token);
				await writeAnilistAuth(ctx.db, {
					accessToken: token,
					expiresAt: expiresAtFromToken(token),
					userId: viewer.id,
					username: viewer.name,
				});
				requestAniListSync();
				return {
					...toPublicStatus(await readAnilistAuth(ctx.db)),
					loginError: null as string | null,
				};
			} catch (error) {
				mapAnilistError(error);
			}
		}),
	disconnect: t.procedure.mutation(async ({ ctx }) => {
		clearAnilistLoginError();
		abortAniListSync();
		await clearAnilistAuth(ctx.db);
		return {
			...toPublicStatus(null),
			loginError: null as string | null,
		};
	}),
	sync: t.procedure.mutation(() => {
		return requestAniListSync();
	}),
	syncStatus: t.procedure.query(() => {
		return getSyncSnapshot();
	}),
	onSyncStatus: t.procedure.subscription(() => {
		return observable<ReturnType<typeof getSyncSnapshot>>((emit) => {
			emit.next(getSyncSnapshot());
			return subscribeSyncStatus((next) => {
				emit.next(next);
			});
		});
	}),
	season: t.procedure
		.input(
			z.object({
				season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]),
				seasonYear: z.number().int(),
				forceRefresh: z.boolean().default(false),
			}),
		)
		.query(async ({ ctx, input, signal }) => {
			try {
				const auth = await readAnilistAuth(ctx.db);
				const settings = await loadAppSettings(ctx.db);
				return await fetchSeasonMedia({
					token: auth?.accessToken,
					season: input.season,
					seasonYear: input.seasonYear,
					titleLanguage: settings.titleLanguage,
					forceRefresh: input.forceRefresh,
					signal,
				});
			} catch (error) {
				mapAnilistError(error);
			}
		}),
	search: t.procedure.input(anilistSearchSchema).query(async ({ ctx, input }) => {
		try {
			const auth = await readAnilistAuth(ctx.db);
			const settings = await loadAppSettings(ctx.db);
			return await searchAniListMedia({
				token: auth?.accessToken,
				query: input.q,
				page: input.page,
				titleLanguage: settings.titleLanguage,
			});
		} catch (error) {
			mapAnilistError(error);
		}
	}),
	addFromSearch: t.procedure
		.input(
			z.object({
				mediaId: z.number().int(),
				status: listStatusSchema.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				const auth = await requireAuth(ctx.db);
				const settings = await loadAppSettings(ctx.db);
				const status = input.status ?? settings.defaultAddToListStatus;
				const saved = await saveMediaListEntry({
					token: auth.accessToken,
					mediaId: input.mediaId,
					status: toAnilistStatus(status, false),
				});
				const upserted = await upsertMediaList(
					ctx.db,
					saved,
					settings.titleLanguage,
				);
				if (!upserted) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Could not save anime to local list",
					});
				}
				return { id: upserted.id };
			} catch (error) {
				mapAnilistError(error);
			}
		}),
		saveEntry: t.procedure
		.input(
			animeListEntrySchema.extend({
				animeId: z.number().int(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				const rows = await ctx.db
					.select({
						id: anime.id,
						title: anime.title,
						score: listEntry.score,
						timesRewatched: listEntry.timesRewatched,
					})
					.from(anime)
					.innerJoin(listEntry, eq(listEntry.animeId, anime.id))
					.where(eq(anime.id, input.animeId))
					.limit(1);
				const row = rows[0];
				if (!row) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Anime not found",
					});
				}
				await enqueueUpdate(ctx.db, {
					animeId: input.animeId,
					title: row.title,
					episode: input.progress,
					payload: {
						status: input.status,
						progress: input.progress,
						score: input.score === undefined ? row.score : input.score,
						notes: input.notes,
						rewatching: input.rewatching,
						timesRewatched: input.timesRewatched ?? row.timesRewatched,
						...(input.dateStarted !== undefined
							? { dateStarted: input.dateStarted }
							: {}),
						...(input.dateCompleted !== undefined
							? { dateCompleted: input.dateCompleted }
							: {}),
					},
				});
				return { ok: true as const };
			} catch (error) {
				mapAnilistError(error);
			}
		}),
});
