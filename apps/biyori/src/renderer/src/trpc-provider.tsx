import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ipcLink } from "@biyori/electron-trpc/renderer";
import { useState, type ReactNode } from "react";
import superjson from "superjson";
import { trpc } from "./trpc";

type TrpcProviderProps = {
	children: ReactNode;
};

export function TrpcProvider({ children }: TrpcProviderProps) {
	const [queryClient] = useState(() => new QueryClient());
	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				ipcLink({
					transformer: superjson,
				}),
			],
		}),
	);

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
}
