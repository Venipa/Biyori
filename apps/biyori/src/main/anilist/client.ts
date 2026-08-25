import { z } from "zod";
import { trackedFetch } from "../http-stats";

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";
const USER_AGENT = "Biyori/1.0";

const graphqlErrorSchema = z.object({
	message: z.string(),
	status: z.number().optional(),
});

const graphqlResponseSchema = z.object({
	data: z.unknown().optional(),
	errors: z.array(graphqlErrorSchema).optional(),
});

export class AnilistApiError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "AnilistApiError";
		this.status = status;
	}
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export async function anilistGraphql<T>(options: { query: string; variables?: Record<string, unknown>; token?: string; signal?: AbortSignal }): Promise<T> {
	const headers: Record<string, string> = {
		Accept: "application/json",
		"Content-Type": "application/json",
		"User-Agent": USER_AGENT,
	};
	if (options.token) {
		headers.Authorization = `Bearer ${options.token}`;
	}

	let retriedRateLimit = false;
	const timeout = AbortSignal.timeout(20_000);
	const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

	for (;;) {
		const response = await trackedFetch(ANILIST_GRAPHQL_URL, {
			method: "POST",
			headers,
			body: JSON.stringify({
				query: options.query,
				variables: options.variables ?? {},
			}),
			signal,
		});

		if (response.status === 429 && !retriedRateLimit) {
			retriedRateLimit = true;
			const retryAfter = Number(response.headers.get("Retry-After"));
			await sleep(Number.isFinite(retryAfter) ? Math.min(retryAfter, 5) * 1000 : 5_000);
			continue;
		}

		const json: unknown = await response.json();
		const parsed = graphqlResponseSchema.safeParse(json);
		if (!parsed.success) {
			throw new AnilistApiError("Invalid AniList response", response.status);
		}

		const firstError = parsed.data.errors?.[0];
		if (firstError) {
			throw new AnilistApiError(firstError.message, firstError.status ?? response.status);
		}

		if (!response.ok) {
			throw new AnilistApiError(`AniList request failed (${response.status})`, response.status);
		}

		return parsed.data.data as T;
	}
}
