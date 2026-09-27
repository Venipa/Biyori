import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/shared/app-router";

export type TorrentRow = inferRouterOutputs<AppRouter>["torrents"]["list"][number];

export function countLabel(value: number | null): string {
	return value == null ? "-" : String(value);
}
