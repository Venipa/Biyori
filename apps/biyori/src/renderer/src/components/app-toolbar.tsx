import { useNavigate } from "@tanstack/react-router";
import { ExternalLinkIcon, InfoIcon, LogOutIcon, RefreshCwIcon, SettingsIcon } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/mainview/components/ui/tooltip";
import { useCheckForUpdates } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";

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
			<DropdownMenuTrigger render={<Button variant='ghost' size='icon' aria-label={label} aria-haspopup='menu' className='overflow-hidden rounded-full' disabled={signingOut} />}>
				<span className='relative flex size-7 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-medium text-muted-foreground'>
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
		<div className='z-40 flex h-11 shrink-0 items-center gap-1.5 border-b bg-card pr-2 pl-2'>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant='ghost'
							size='icon'
							aria-label='Synchronize'
							disabled={syncRunning || sync.isPending}
							onClick={() => {
								void sync.mutateAsync();
							}}
						/>
					}>
					<RefreshCwIcon />
				</TooltipTrigger>
				<TooltipContent>Synchronize</TooltipContent>
			</Tooltip>
			<div className='ml-auto flex shrink-0 items-center gap-1.5'>
				<AccountButton />
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant='ghost'
								size='icon'
								aria-label='Settings'
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
		</div>
	);
}
