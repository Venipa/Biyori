import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ExternalLinkIcon, InfoIcon, LogOutIcon, RefreshCwIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { desktopRpc } from "@/desktop-rpc";
import { profileInitials } from "@/lib/profile-initials";
import { type AnilistSearchForm, type AnilistSearchFormInput, anilistSearchFormSchema } from "@/lib/schemas/anilist-search";
import { handleSuggestKeyDown, SearchSuggestPanel, suggestionOptionCount } from "@/mainview/components/search-suggest";
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
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/mainview/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/mainview/components/ui/tooltip";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { setListFilterText, useListFilterResetToken } from "@/mainview/lib/list-filter";
import { trpc } from "@/mainview/trpc";

const LIST_FILTER_DEBOUNCE_MS = 250;

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
	const navigate = useNavigate();
	const animeInfo = useAnimeInfoNav();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isAnimeListPage = pathname === "/app/anime-list";
	const isSeasonsPage = pathname === "/app/seasons";
	const isLiveFilterPage = isAnimeListPage || isSeasonsPage;
	const form = useForm<AnilistSearchFormInput, unknown, AnilistSearchForm>({
		resolver: zodResolver(anilistSearchFormSchema),
		defaultValues: { q: "" },
	});
	const syncStatus = trpc.anilist.syncStatus.useQuery();
	const sync = trpc.anilist.sync.useMutation();
	const syncRunning = syncStatus.data?.phase === "running";
	const searchId = useId();
	const listId = `${searchId}-suggest`;
	const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const filterResetToken = useListFilterResetToken();
	const qValue = form.watch("q");
	const trimmedQ = (typeof qValue === "string" ? qValue : "").trim();
	const canSubmit = trimmedQ.length > 0;
	const suggestReady = !isLiveFilterPage && trimmedQ.length >= 2;
	const [debouncedQ, setDebouncedQ] = useState("");
	const [panelOpen, setPanelOpen] = useState(true);
	const [active, setActive] = useState({ q: "", index: 0 });
	const suggestQuery = trpc.anime.suggest.useQuery({ q: debouncedQ }, { enabled: !isLiveFilterPage && debouncedQ.length >= 2 });
	const items = !isLiveFilterPage && debouncedQ === trimmedQ ? (suggestQuery.data ?? []) : [];
	const optionCount = suggestionOptionCount(items);
	const showPanel = suggestReady && panelOpen;
	if (active.q !== debouncedQ) {
		setActive({ q: debouncedQ, index: 0 });
	}
	const activeIndex = active.q === debouncedQ ? active.index : 0;

	function goToAnilistSearch(q: string): void {
		if (!q) {
			return;
		}
		setPanelOpen(false);
		void navigate({
			to: "/app/search",
			search: { q },
		});
	}

	function chooseSuggestion(index: number): void {
		const hit = items[index];
		if (hit) {
			setPanelOpen(false);
			animeInfo.open({ id: hit.id, infoTab: "main" });
			return;
		}
		goToAnilistSearch(trimmedQ);
	}

	useEffect(() => {
		if (filterResetToken === 0) {
			return;
		}
		form.reset({ q: "" });
	}, [filterResetToken, form]);

	useEffect(() => {
		if (filterTimer.current) {
			clearTimeout(filterTimer.current);
			filterTimer.current = null;
		}
		if (!isLiveFilterPage) {
			return;
		}
		const trimmed = (typeof qValue === "string" ? qValue : "").trim();
		if (trimmed.length === 0) {
			setListFilterText("");
			return;
		}
		if (trimmed.length === 1) {
			return;
		}
		filterTimer.current = setTimeout(() => {
			setListFilterText(trimmed);
		}, LIST_FILTER_DEBOUNCE_MS);
		return () => {
			if (filterTimer.current) {
				clearTimeout(filterTimer.current);
			}
		};
	}, [qValue, isLiveFilterPage]);

	useEffect(() => {
		if (isLiveFilterPage || trimmedQ.length < 2) {
			setDebouncedQ("");
			return;
		}
		const timer = setTimeout(() => {
			setDebouncedQ(trimmedQ);
		}, LIST_FILTER_DEBOUNCE_MS);
		return () => {
			clearTimeout(timer);
		};
	}, [trimmedQ, isLiveFilterPage]);

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

			<form
				className='relative z-20 flex h-full min-w-0 flex-1 items-stretch'
				onSubmit={form.handleSubmit((data) => {
					goToAnilistSearch(data.q.trim());
				})}>
				<label className='sr-only' htmlFor={searchId}>
					Search AniList
				</label>
				<Controller
					control={form.control}
					name='q'
					render={({ field }) => (
						<InputGroup
							variant='ghost'
							className='h-full rounded-none border-0 shadow-none hover:bg-transparent has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:bg-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0'>
							<InputGroupInput
								id={searchId}
								placeholder={isLiveFilterPage ? "Filter list or search AniList" : "Search AniList for anime"}
								name={field.name}
								ref={field.ref}
								role='combobox'
								aria-autocomplete='list'
								aria-expanded={showPanel}
								aria-controls={listId}
								aria-activedescendant={showPanel ? `${listId}-${activeIndex}` : undefined}
								className='shadow-none focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0'
								onFocus={() => {
									setPanelOpen(true);
								}}
								onClick={() => {
									setPanelOpen(true);
								}}
								onBlur={() => {
									field.onBlur();
									setPanelOpen(false);
								}}
								value={typeof field.value === "string" ? field.value : ""}
								onChange={(event) => {
									setPanelOpen(true);
									field.onChange(event);
								}}
								onKeyDown={(event) => {
									handleSuggestKeyDown({
										event,
										open: showPanel,
										optionCount,
										activeIndex,
										onActiveIndex: (index) => {
											setActive({ q: debouncedQ, index });
										},
										onDismiss: () => {
											setPanelOpen(false);
										},
										onChoose: chooseSuggestion,
									});
								}}
							/>
							<InputGroupAddon align='inline-end'>
								<Tooltip>
									<TooltipTrigger render={<InputGroupButton type='submit' size='icon-xs' aria-label='Search AniList' disabled={!canSubmit} />}>
										<SearchIcon />
									</TooltipTrigger>
									<TooltipContent>Search AniList</TooltipContent>
								</Tooltip>
							</InputGroupAddon>
						</InputGroup>
					)}
				/>
				{showPanel ? (
					<SearchSuggestPanel
						listId={listId}
						q={trimmedQ}
						items={items}
						activeIndex={Math.min(activeIndex, optionCount - 1)}
						onActiveIndex={(index) => {
							setActive({ q: debouncedQ, index });
						}}
						onOpen={(id) => {
							setPanelOpen(false);
							animeInfo.open({ id, infoTab: "main" });
						}}
						onSearchAnilist={() => {
							goToAnilistSearch(trimmedQ);
						}}
					/>
				) : null}
			</form>

			<div className='ml-2 flex shrink-0 items-center gap-1.5'>
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
