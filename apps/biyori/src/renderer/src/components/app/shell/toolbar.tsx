import { useTranslation } from "@biyori/translations/react";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLinkIcon, InfoIcon, LogOutIcon, RefreshCwIcon, SettingsIcon } from "lucide-react";
import { useState } from "react";
import { desktopRpc } from "@/desktop-rpc";
import { profileInitials } from "@/lib/profile-initials";
import { AccountAvatar, openAnilistProfile } from "@/mainview/components/app/shell/account-avatar";
import { Button } from "@/mainview/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/mainview/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/mainview/components/ui/tooltip";
import { toggleActivityPanel, useActivityPanelState } from "@/mainview/lib/activity-panel";
import { useCheckForUpdates } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";

const titleButtonClass = "h-full rounded-none border-0 px-2 active:translate-y-0 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-out active:[&_svg]:scale-90";

const BELL_SOURCES = new Set(["episode-ready", "torrent"]);

function activityBellSignature(snapshot: { items: Array<{ id: string; source: string }> }): string {
	return snapshot.items
		.filter((row) => BELL_SOURCES.has(row.source))
		.map((row) => row.id)
		.join("\0");
}

const ACTIVITY_TOKEN = /\0/;

function gainedToken(next: string, prev: string): boolean {
	const previous = new Set(prev.split(ACTIVITY_TOKEN).filter((token) => token.length > 0));
	return next.split(ACTIVITY_TOKEN).some((token) => token.length > 0 && !previous.has(token));
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
	const { t } = useTranslation();
	const { open } = useActivityPanelState();
	const signature = trpc.activity.snapshot.useQuery(undefined, { select: activityBellSignature }).data;
	const [seen, setSeen] = useState<string | null>(null);
	const [swingId, setSwingId] = useState(0);
	const [unread, setUnread] = useState(false);
	if (open && unread) {
		setUnread(false);
	}
	if (signature != null && signature !== seen) {
		const gained = seen != null && gainedToken(signature, seen);
		setSeen(signature);
		if (gained && !open) {
			setUnread(true);
			setSwingId((value) => value + 1);
		}
	}
	const label = open ? t("shell.closeActivityCenter") : t("shell.openActivityCenter");

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
			<TooltipContent>{open ? t("shell.closeActivity") : t("shell.activity")}</TooltipContent>
		</Tooltip>
	);
}

function AccountButton() {
	const { t } = useTranslation();
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
	const label = connected && username ? username : t("shell.account");
	const signingOut = disconnect.isPending || setSettings.isPending;
	const { checking, checkForUpdates } = useCheckForUpdates();

	function openProfile(): void {
		if (!username) {
			return;
		}
		openAnilistProfile(username);
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
				<span className='relative transition-transform duration-150 ease-out group-active/button:scale-90'>
					<AccountAvatar
						initials={initials}
						avatarUrl={avatarUrl}
						className='size-6 text-[11px] transition-shadow group-hover/button:ring-foreground/30 group-data-popup-open/button:ring-2 group-data-popup-open/button:ring-primary'
					/>
					{connected ? <span className='absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background' /> : null}
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='min-w-60'>
				<DropdownMenuGroup>
					<DropdownMenuItem
						className='gap-3 bg-muted/50 p-2'
						onClick={() => {
							if (connected) {
								openProfile();
							} else {
								void authorize.mutateAsync();
							}
						}}>
						<AccountAvatar initials={initials} avatarUrl={avatarUrl} className='size-10 shrink-0 text-sm' />
						<span className='flex min-w-0 flex-1 flex-col'>
							<span className='truncate text-sm font-medium'>{connected && username ? username : t("shell.notSignedIn")}</span>
							<span className='flex items-center gap-1 truncate text-xs text-muted-foreground'>
								{connected ? <span className='size-1.5 rounded-full bg-emerald-500' /> : null}
								{connected ? t("shell.anilist") : t("shell.connectAnilist")}
							</span>
						</span>
						<ExternalLinkIcon className='text-muted-foreground' />
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						onClick={() => {
							void desktopRpc.request.openSettings({});
						}}>
						<SettingsIcon />
						{t("shell.accountSettings")}
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem disabled={checking} onClick={checkForUpdates}>
						<RefreshCwIcon className={checking ? "animate-spin" : undefined} />
						{t("shell.checkForUpdates")}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							void navigate({ to: "/app/about" });
						}}>
						<InfoIcon />
						{t("shell.about")}
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
								{t("shell.logOut")}
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
export const APP_TOOLBAR_HEIGHT = 32;
export function AppToolbar() {
	const { t } = useTranslation();
	const syncStatus = trpc.anilist.syncStatus.useQuery();
	const sync = trpc.anilist.sync.useMutation();
	const syncRunning = syncStatus.data?.phase === "running";

	return (
		<TooltipProvider delay={400}>
			<div className='app-region-no-drag flex h-full shrink-0 items-stretch' style={{ height: `${APP_TOOLBAR_HEIGHT}px` }}>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant='ghost'
								aria-label={t("shell.synchronize")}
								className={titleButtonClass}
								loading={syncRunning || sync.isPending}
								onClick={() => {
									void sync.mutateAsync();
								}}
							/>
						}>
						<RefreshCwIcon />
					</TooltipTrigger>
					<TooltipContent>{t("shell.synchronize")}</TooltipContent>
				</Tooltip>
				<ActivityTitleButton />
				<AccountButton />
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant='ghost'
								aria-label={t("shell.settings")}
								className={titleButtonClass}
								onClick={() => {
									void desktopRpc.request.openSettings({});
								}}
							/>
						}>
						<SettingsIcon />
					</TooltipTrigger>
					<TooltipContent>{t("shell.settings")}</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}
