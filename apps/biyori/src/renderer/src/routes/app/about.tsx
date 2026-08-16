import { createFileRoute } from "@tanstack/react-router";
import { RefreshCwIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/mainview/components/ui/button";
import { desktopRpc } from "@/desktop-rpc";
import { trpc } from "@/mainview/trpc";
import { useUpdateStatus } from "@/mainview/lib/update-status";

export const Route = createFileRoute("/app/about")({
	component: AboutPage,
});

function AboutPage() {
	const status = useUpdateStatus();
	const { mutateAsync: checkForUpdates, isPending } =
		trpc.updater.check.useMutation();

	useEffect(() => {
		void checkForUpdates();
	}, [checkForUpdates]);

	return (
		<div className="flex h-full flex-col gap-4 overflow-auto p-4">
			<div>
				<h1 className="text-lg font-semibold">About Biyori</h1>
				<p className="text-sm text-muted-foreground">
					Anime list tracker powered by AniList.
				</p>
			</div>
			<dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Version</dt>
				<dd>{status.localVersion || "..."}</dd>
				<dt className="text-muted-foreground">Channel</dt>
				<dd>{status.localChannel || "..."}</dd>
				<dt className="text-muted-foreground">Build</dt>
				<dd className="truncate font-mono text-xs">
					{status.localHash ? status.localHash.slice(0, 12) : "..."}
				</dd>
				<dt className="text-muted-foreground">Updates</dt>
				<dd>{status.message || "Not checked yet"}</dd>
			</dl>
			{status.error ? (
				<p className="text-sm text-destructive">{status.error}</p>
			) : null}
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					variant="outline"
					disabled={isPending || status.phase === "checking"}
					onClick={() => {
						void checkForUpdates();
					}}
				>
					<RefreshCwIcon data-icon="inline-start" />
					Check for updates
				</Button>
				{status.updateAvailable ? (
					<Button
						type="button"
						onClick={() => {
							void desktopRpc.request.openUpdate({});
						}}
					>
						Open update
					</Button>
				) : null}
			</div>
		</div>
	);
}
