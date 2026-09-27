import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { Button } from "@/mainview/components/ui/button";
import { trpc } from "@/mainview/trpc";

export function formatCheckRemaining(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;
	if (hours > 0) {
		return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
	}
	return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function NextTorrentCheck(): ReactElement {
	const utils = trpc.useUtils();
	const poll = trpc.torrents.poll.useQuery();
	trpc.torrents.onPoll.useSubscription(undefined, {
		onData: (next) => {
			utils.torrents.poll.setData(undefined, next);
		},
	});
	const enabled = poll.data?.enabled ?? false;
	const nextCheckAt = poll.data?.nextCheckAt ?? null;
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!enabled || nextCheckAt == null) {
			return;
		}
		const id = setInterval(() => {
			setNow(Date.now());
		}, 1000);
		return () => {
			clearInterval(id);
		};
	}, [enabled, nextCheckAt]);

	if (!enabled) {
		return <p className='text-sm text-muted-foreground'>Automatic checks are off</p>;
	}
	if (nextCheckAt == null) {
		return <p className='text-sm text-muted-foreground'>Next check pending</p>;
	}
	const remaining = nextCheckAt - now;
	return <p className='text-sm text-muted-foreground tabular-nums'>{remaining <= 0 ? "Checking..." : `Next check in ${formatCheckRemaining(remaining)}`}</p>;
}

export function CheckNewTorrentsButton(): ReactElement {
	const utils = trpc.useUtils();
	const refresh = trpc.torrents.refresh.useMutation({
		onSuccess: (next) => {
			utils.torrents.list.setData(undefined, next);
		},
	});
	return (
		<Button
			variant='outline'
			size='sm'
			disabled={refresh.isPending}
			onClick={() => {
				void refresh.mutateAsync();
			}}>
			Check new torrents
		</Button>
	);
}

export function TorrentToolbar({ children }: { children?: ReactNode }): ReactElement {
	return (
		<div className='flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2'>
			<NextTorrentCheck />
			<div className='flex gap-2'>{children}</div>
		</div>
	);
}
