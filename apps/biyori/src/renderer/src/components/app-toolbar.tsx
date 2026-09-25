import { useNavigate } from "@tanstack/react-router";
import { ExternalLinkIcon, InfoIcon, LogOutIcon, RefreshCwIcon, SettingsIcon } from "lucide-react";
import { useState } from "react";
import { desktopRpc } from "@/desktop-rpc";
import { profileInitials } from "@/lib/profile-initials";
import { Button } from "@/mainview/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/mainview/components/ui/dropdown-menu";
import { Image } from "@/mainview/components/ui/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/mainview/components/ui/tooltip";
import { toggleActivityPanel, useActivityPanelState } from "@/mainview/lib/activity-panel";
import { useCheckForUpdates } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";

const titleButtonClass = "h-full rounded-none border-0 px-2 active:translate-y-0 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-out active:[&_svg]:scale-90";

function gainedToken(next: string, prev: string): boolean {
	if (!next) {
		return false;
	}
	const previous = new Set(prev.split("\0").filter(Boolean));
	return next.split("\0").some((token) => token.length > 0 && !previous.has(token));
}

function ActivityBell({ swing, unread }: { swing: boolean; unread: boolean }) {
	if (!unread) {
		return (
			<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden className='size-4'>
				<path d='M10.268 21a2 2 0 0 0 3.464 0' />
				<path d='M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326' />
			</svg>
		);
	}
	return (
		<svg viewBox='0 0 24 24' aria-hidden className='size-4'>
			<path
				d='M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'
				strokeWidth='1.75'
				strokeLinecap='round'
				strokeLinejoin='round'
				className='fill-destructive stroke-destructive/55'
			/>
			<circle cx='12' cy='21' r='2.35' className={swing ? "bell-clapper fill-destructive" : "fill-destructive"} />
		</svg>
	);
}

function ActivityTitleButton() {
	const { open } = useActivityPanelState();
	const activityQuery = trpc.activity.snapshot.useQuery();
	const live = activityQuery.data?.live ?? [];
	const items = activityQuery.data?.items ?? [];
	const liveSig = live.map((row) => row.source).join("\0");
	const itemSig = items.map((row) => row.id).join("\0");
	const [seen, setSeen] = useState<{ live: string; items: string } | null>(null);
	const [swingId, setSwingId] = useState(0);
	const [unread, setUnread] = useState(false);
	if (open && unread) {
		setUnread(false);
	}
	if (activityQuery.data && (seen?.live !== liveSig || seen?.items !== itemSig)) {
		const gained = seen != null && (gainedToken(liveSig, seen.live) || gainedToken(itemSig, seen.items));
		setSeen({ live: liveSig, items: itemSig });
		if (gained && !open) {
			setUnread(true);
			setSwingId((value) => value + 1);
		}
	}
	const label = open ? "Close activity center" : "Open activity center";

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant='ghost'
						data-activity-toggle
						aria-label={label}
						aria-expanded={open}
						className={titleButtonClass}
						onClick={() => {
							toggleActivityPanel();
						}}
					/>
				}>
				<ActivityBell key={swingId} swing={swingId > 0} unread={unread} />
			</TooltipTrigger>
			<TooltipContent>{open ? "Close activity" : "Activity"}</TooltipContent>
		</Tooltip>
	);
}

function AccountButton() {
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const statusQuery = trpc.anilist.status.useQuery();
	const disconnect = trpc.anilist.disconnect.useMutation();
	const authorize = trpc.anilist.authorize.useMutation();
	const setSettings = trpc.settings.set.useMutation({
		onSuccess: (settings) => {
			utils.settings.get.setData(undefined, settings);
		},
	});
	const connected = Boolean(statusQuery.data?.connected);
	const username = statusQuery.data?.username?.trim() ?? "";
	const avatarUrl = statusQuery.data?.avatarUrl?.trim() || null;
	const initials = profileInitials(username);
	const label = connected && username ? username : "Account";
	const signingOut = disconnect.isPending || setSettings.isPending;
	const { checking, checkForUpdates } = useCheckForUpdates();

	function openProfile(): void {
		if (!username) {
			return;
		}
		void desktopRpc.request.openExternal({ url: `https://anilist.co/user/${encodeURIComponent(username)}/` });
	}

	function logOut(): void {
		window.setTimeout(() => {
			void (async () => {
				await disconnect.mutateAsync();
				await setSettings.mutateAsync({ onboardingComplete: false });
				await utils.anilist.status.invalidate();
				void desktopRpc.request.closeSettings({});
				void navigate({ to: "/onboarding" });
			})();
		}, 0);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant='ghost' aria-label={label} aria-haspopup='menu' className={titleButtonClass} disabled={signingOut} />}>
				<span className='relative flex size-5 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-medium text-muted-foreground transition-transform duration-150 ease-out group-active/button:scale-90'>
					{initials}
					{avatarUrl ? <Image src={avatarUrl} alt='' className='absolute inset-0 size-full rounded-full' skeletonClassName='rounded-full' /> : null}
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='min-w-52'>
				<DropdownMenuGroup>
					<DropdownMenuLabel className='font-normal'>
						<p className='truncate text-sm font-medium text-foreground'>{connected && username ? username : "Not signed in"}</p>
						<p className='truncate text-xs'>{connected ? "AniList" : "Connect to use your list"}</p>
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					{connected ? (
						<DropdownMenuItem
							onClick={() => {
								openProfile();
							}}>
							<ExternalLinkIcon />
							View on AniList
						</DropdownMenuItem>
					) : (
						<DropdownMenuItem
							onClick={() => {
								void authorize.mutateAsync();
							}}>
							<ExternalLinkIcon />
							Connect AniList
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						onClick={() => {
							void desktopRpc.request.openSettings({});
						}}>
						<SettingsIcon />
						Account settings
					</DropdownMenuItem>
					<DropdownMenuItem disabled={checking} onClick={checkForUpdates}>
						<RefreshCwIcon />
						Check for updates
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							void navigate({ to: "/app/about" });
						}}>
						<InfoIcon />
						About
					</DropdownMenuItem>
				</DropdownMenuGroup>
				{connected ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								variant='destructive'
								disabled={signingOut}
								onClick={() => {
									logOut();
								}}>
								<LogOutIcon />
								Log out
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function AppToolbar() {
	const syncStatus = trpc.anilist.syncStatus.useQuery();
	const sync = trpc.anilist.sync.useMutation();
	const syncRunning = syncStatus.data?.phase === "running";

	return (
		<TooltipProvider delay={400}>
			<div className='app-region-no-drag flex h-full shrink-0 items-stretch'>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant='ghost'
								aria-label='Synchronize'
								className={titleButtonClass}
								loading={syncRunning || sync.isPending}
								onClick={() => {
									void sync.mutateAsync();
								}}
							/>
						}>
						<RefreshCwIcon />
					</TooltipTrigger>
					<TooltipContent>Synchronize</TooltipContent>
				</Tooltip>
				<ActivityTitleButton />
				<AccountButton />
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant='ghost'
								aria-label='Settings'
								className={titleButtonClass}
								onClick={() => {
									void desktopRpc.request.openSettings({});
								}}
							/>
						}>
						<SettingsIcon />
					</TooltipTrigger>
					<TooltipContent>Settings</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}
