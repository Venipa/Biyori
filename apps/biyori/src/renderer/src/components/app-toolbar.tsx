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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/mainview/components/ui/tooltip";
import { useCheckForUpdates } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";

const titleButtonClass = "h-full rounded-none border-0 px-2 active:translate-y-0 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-out active:[&_svg]:scale-90";

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
