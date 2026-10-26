import { ipcLink } from "@biyori/electron-trpc/renderer";
import { keepPreviousData, QueryClient } from "@tanstack/react-query";
import { createTRPCQueryUtils, createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "@/shared/app-router";

export const trpc = createTRPCReact<AppRouter>();

// one client per window, shared by React and route loaders
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			placeholderData: keepPreviousData,
		},
	},
});

export const trpcClient = trpc.createClient({
	links: [ipcLink({ transformer: superjson })],
});

export const trpcUtils = createTRPCQueryUtils({ client: trpcClient, queryClient });

export type TrpcQueryUtils = typeof trpcUtils;
