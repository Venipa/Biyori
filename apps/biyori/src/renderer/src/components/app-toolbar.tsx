import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  FolderIcon,
  RefreshCwIcon,
  SettingsIcon
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { desktopRpc } from "@/desktop-rpc";
import {
  type AnilistSearchForm,
  type AnilistSearchFormInput,
  anilistSearchFormSchema,
} from "@/lib/schemas/anilist-search";
import { Button } from "@/mainview/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/mainview/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupInput
} from "@/mainview/components/ui/input-group";
import { useAddLibraryFolder } from "@/mainview/lib/library-folder";
import { setListFilterText } from "@/mainview/lib/list-filter";
import { trpc } from "@/mainview/trpc";

const LIST_FILTER_DEBOUNCE_MS = 250;

export function AppToolbar() {
	const navigate = useNavigate();
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
	const settingsQuery = trpc.settings.get.useQuery();
	const addLibraryFolder = useAddLibraryFolder();
	const syncRunning = syncStatus.data?.phase === "running";
	const folders = settingsQuery.data?.libraryFolders ?? [];
	const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const qValue = form.watch("q");

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

	return (
		<div className="flex h-11 shrink-0 items-center gap-1.5 border-b bg-card px-2">
			<Button
				variant="ghost"
				size="icon"
				aria-label="Synchronize"
				disabled={syncRunning || sync.isPending}
				onClick={() => {
					void sync.mutateAsync();
				}}
			>
				<RefreshCwIcon />
			</Button>

			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							className="gap-1 px-2"
							aria-label="Library folders"
						/>
					}
				>
					<FolderIcon data-icon="inline-start" />
					<ChevronDownIcon className="size-3.5 text-muted-foreground" />
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-auto min-w-56">
					{folders.map((folder) => (
						<DropdownMenuItem
							key={folder.path}
							onClick={() => {
								void desktopRpc.request.openPath({ path: folder.path });
							}}
						>
							{folder.path}
						</DropdownMenuItem>
					))}
					{folders.length > 0 ? <DropdownMenuSeparator /> : null}
					<DropdownMenuItem
						onClick={() => {
							void addLibraryFolder.addFromPicker();
						}}
					>
						Add new folder...
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>


			<Button
				variant="ghost"
				size="icon"
				aria-label="Settings"
				onClick={() => {
					void desktopRpc.request.openSettings({});
				}}
			>
				<SettingsIcon />
			</Button>

			<form
				className="ml-auto w-72"
				onSubmit={form.handleSubmit((data) => {
					void navigate({
						to: "/app/search",
						search: { q: data.q },
					});
				})}
			>
				<Controller
					control={form.control}
					name="q"
					render={({ field, fieldState: _fieldState }) => (
						<>
							<InputGroup>
								<InputGroupInput
									placeholder={
										isLiveFilterPage
											? "Filter list or search AniList"
											: "Search AniList for anime"
									}
									name={field.name}
									ref={field.ref}
									onBlur={field.onBlur}
									value={typeof field.value === "string" ? field.value : ""}
									onChange={field.onChange}
								/>
							</InputGroup>
							{/* <FieldError errors={[fieldState.error]} /> */}
						</>
					)}
				/>
			</form>
		</div>
	);
}
