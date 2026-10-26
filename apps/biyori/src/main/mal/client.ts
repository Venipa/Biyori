import { trackedFetch } from "../http-stats";

const MAL_API_URL = "https://api.myanimelist.net/v2";

export class MalApiError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "MalApiError";
		this.status = status;
	}
}

export async function malRequest(options: { path: string; token: string; method?: "GET" | "PATCH"; form?: Record<string, string>; signal?: AbortSignal }): Promise<unknown> {
	const timeout = AbortSignal.timeout(20_000);
	const response = await trackedFetch(options.path.startsWith("http") ? options.path : `${MAL_API_URL}${options.path}`, {
		method: options.method ?? "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${options.token}`,
			...(options.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
		},
		body: options.form ? new URLSearchParams(options.form).toString() : undefined,
		signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
	});
	const text = await response.text();
	if (!response.ok) {
		throw new MalApiError(`MyAnimeList ${response.status}: ${text.slice(0, 200)}`, response.status);
	}
	return text ? JSON.parse(text) : null;
}
