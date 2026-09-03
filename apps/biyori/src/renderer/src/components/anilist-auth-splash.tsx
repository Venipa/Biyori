import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import Logo from "@/mainview/components/logo";
import { trpc } from "@/mainview/trpc";

const HIDE_MS = 1800;

export function AnilistAuthSplash() {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const [username, setUsername] = useState<string | null>(null);
	const utils = trpc.useUtils();
	trpc.anilist.onAuthSuccess.useSubscription(undefined, {
		onData: (event) => {
			setUsername(event.username);
			void utils.anilist.status.invalidate();
		},
	});
	trpc.anilist.onAuthError.useSubscription(undefined, {
		onData: () => {
			void utils.anilist.status.invalidate();
		},
	});

	useEffect(() => {
		if (!username) {
			return;
		}
		const timer = window.setTimeout(() => {
			setUsername(null);
		}, HIDE_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [username]);

	if (!username || pathname === "/splash" || pathname.startsWith("/settings") || pathname === "/update") {
		return null;
	}

	return (
		<div className='absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background px-8'>
			<Logo className='size-14' />
			<p className='text-center text-sm'>Connected as {username}</p>
		</div>
	);
}
