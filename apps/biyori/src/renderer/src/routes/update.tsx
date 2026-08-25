import { createFileRoute } from "@tanstack/react-router";
import { DownloadIcon, RefreshCwIcon } from "lucide-react";
import { desktopRpc } from "@/desktop-rpc";
import { Button } from "@/mainview/components/ui/button";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";

export const Route = createFileRoute("/update")({
	component: UpdatePage,
});

function UpdatePage() {
	const status = useUpdateStatus();
	const check = trpc.updater.check.useMutation();
	const download = trpc.updater.download.useMutation();
	const apply = trpc.updater.restartAndApply.useMutation();

	const canDownload = status.updateAvailable && !status.updateReady && status.phase !== "downloading" && status.phase !== "dev";
	const canApply = status.updateReady;

	return (
		<div className='flex flex-1 w-full flex-col bg-background text-foreground'>
			<div className='border-b bg-muted px-4 py-2'>
				<h1 className='text-sm font-semibold'>Update Biyori</h1>
			</div>
			<div className='flex flex-1 flex-col gap-4 p-4'>
				<div className='space-y-1 text-sm'>
					<p>
						<span className='text-muted-foreground'>Installed: </span>
						{status.localVersion || "..."} ({status.localChannel || "..."})
					</p>
					<p>
						<span className='text-muted-foreground'>Available: </span>
						{status.remoteVersion ?? "None"}
					</p>
					<p className='text-muted-foreground'>{status.message || "Idle"}</p>
					{status.error ? <p className='text-destructive'>{status.error}</p> : null}
				</div>
				<div className='mt-auto flex flex-wrap items-center justify-end gap-2'>
					<Button
						type='button'
						variant='outline'
						disabled={check.isPending || status.phase === "checking"}
						onClick={() => {
							void check.mutateAsync();
						}}>
						<RefreshCwIcon data-icon='inline-start' />
						Check again
					</Button>
					{canDownload ? (
						<Button
							type='button'
							disabled={download.isPending || status.phase === "downloading"}
							onClick={() => {
								void download.mutateAsync();
							}}>
							<DownloadIcon data-icon='inline-start' />
							Download
						</Button>
					) : null}
					{canApply ? (
						<Button
							type='button'
							disabled={apply.isPending}
							onClick={() => {
								void apply.mutateAsync();
							}}>
							Restart to update
						</Button>
					) : null}
					<Button
						type='button'
						variant='outline'
						onClick={() => {
							void desktopRpc.request.closeUpdate({});
						}}>
						Close
					</Button>
				</div>
			</div>
		</div>
	);
}
