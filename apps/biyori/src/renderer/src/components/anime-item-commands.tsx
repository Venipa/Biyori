import type { ComponentType, ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { desktopRpc } from "@/desktop-rpc";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import type { SelectedAnime } from "@/mainview/lib/selected-anime";
import { listStatusSchema, type ListStatus } from "@/shared/list";
import { trpc } from "@/mainview/trpc";

function parseCustomExternalLinks(
	raw: string,
	title: string,
	id: number | null,
): Array<{ label: string; url: string }> {
	return raw.split(/\r?\n/).flatMap((line) => {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			return [];
		}
		const split = trimmed.indexOf("|");
		if (split <= 0) {
			return [];
		}
		const label = trimmed.slice(0, split).trim();
		const template = trimmed.slice(split + 1).trim();
		if (!label || !template) {
			return [];
		}
		const url = template
			.replace(/%title%/g, encodeURIComponent(title))
			.replace(/%id%/g, id != null ? String(id) : "");
		return [{ label, url }];
	});
}

type ItemProps = {
	disabled?: boolean;
	variant?: "default" | "destructive";
	onClick?: () => void;
	children?: ReactNode;
};

type MenuParts = {
	Item: ComponentType<ItemProps>;
	Sub: ComponentType<{ children?: ReactNode }>;
	SubTrigger: ComponentType<{
		children?: ReactNode;
		disabled?: boolean;
		onClick?: () => void;
	}>;
	SubContent: ComponentType<{ children?: ReactNode }>;
	Separator: ComponentType;
	Shortcut: ComponentType<{ children?: ReactNode }>;
};

export type DiscoverAnimeTarget = {
	id: number;
	title: string;
	episodes: number;
	trailerId?: string | null;
	listStatus?: ListStatus | null;
};

function externalUrl(
	kind:
		| "anilist"
		| "anidb"
		| "ann"
		| "mal"
		| "reddit"
		| "wikipedia"
		| "youtube"
		| "google",
	title: string,
	id: number | null,
	trailerId?: string | null,
): string | null {
	const q = encodeURIComponent(title);
	switch (kind) {
		case "anilist":
			if (id != null) {
				return `https://anilist.co/anime/${id}`;
			}
			return `https://anilist.co/search/anime?search=${q}`;
		case "anidb":
			return `https://anidb.net/anime/?adb.search=${q}`;
		case "ann":
			return `https://www.animenewsnetwork.com/search?q=${q}`;
		case "mal":
			return `https://myanimelist.net/anime.php?q=${q}`;
		case "reddit":
			return `https://www.reddit.com/search?q=${encodeURIComponent(`subreddit:anime title:${title} episode discussion`)}&sort=new`;
		case "wikipedia":
			return `https://en.wikipedia.org/wiki/Special:Search?search=${q}`;
		case "youtube":
			if (trailerId) {
				return `https://youtu.be/${trailerId}`;
			}
			return `https://www.youtube.com/results?search_query=${q}`;
		case "google":
			return `https://www.google.com/search?q=${q}`;
	}
}

const externalItems = [
	{ kind: "anilist" as const, label: "AniList" },
	{ kind: "anidb" as const, label: "AniDB" },
	{ kind: "ann" as const, label: "Anime News Network" },
	{ kind: "mal" as const, label: "MyAnimeList" },
	{ kind: "reddit" as const, label: "Reddit" },
	{ kind: "wikipedia" as const, label: "Wikipedia" },
	{ kind: "youtube" as const, label: "YouTube" },
	{ kind: "google" as const, label: "Google" },
];

async function copyText(value: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(value);
	} catch {
		/* ignore clipboard failures */
	}
}

export function AnimeItemCommands({
	parts,
	mode = "list",
	anime,
	discover,
	onInformation,
	onEdit,
	onDelete,
}: {
	parts: MenuParts;
	mode?: "list" | "discover";
	anime?: SelectedAnime | null;
	discover?: DiscoverAnimeTarget | null;
	onInformation?: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
}) {
	const {
		Item,
		Sub,
		SubTrigger,
		SubContent,
		Separator,
		Shortcut,
	} = parts;
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const isList = mode === "list";
	const title = isList ? (anime?.title ?? "") : (discover?.title ?? "");
	const id = isList ? (anime?.id ?? null) : (discover?.id ?? null);
	const trailerId = discover?.trailerId ?? null;
	const disabled = isList ? anime == null : discover == null;
	const nextEpisode = anime
		? Math.min(
				anime.episodesWatched + 1,
				anime.episodes || anime.episodesWatched + 1,
			)
		: 1;
	const lastEpisode = anime?.episodesWatched ?? 0;
	const hasFolder = Boolean(anime?.folder);
	const episodesQuery = trpc.library.episodes.useQuery(
		{ animeId: anime?.id ?? 0 },
		{ enabled: Boolean(isList && anime?.id) },
	);
	const scan = trpc.library.scan.useMutation();
	const playEpisode = trpc.library.playEpisode.useMutation();
	const playNext = trpc.library.playNext.useMutation();
	const playRandom = trpc.library.playRandom.useMutation();
	const addFromSearch = trpc.anilist.addFromSearch.useMutation({
		onSuccess: (_data, variables) => {
			void invalidateAnimeQueries(utils, "added", variables.mediaId);
		},
	});
	const saveEntry = trpc.anilist.saveEntry.useMutation({
		onSuccess: (_data, variables) => {
			void invalidateAnimeQueries(utils, "entrySaved", variables.animeId);
		},
	});
	const localEpisodes = episodesQuery.data ?? [];
	const listLookup = trpc.anime.listed.useQuery(undefined, {
		enabled: Boolean(!isList && discover?.id != null),
	});
	const settingsQuery = trpc.settings.get.useQuery();
	const customLinks = parseCustomExternalLinks(
		settingsQuery.data?.externalLinks ?? "",
		title,
		id,
	);
	const matchedList = listLookup.data?.find((row) => row.id === discover?.id);
	const matchedStatus = matchedList
		? listStatusSchema.safeParse(matchedList.status)
		: null;
	const discoverStatus =
		discover?.listStatus ??
		(matchedStatus?.success ? matchedStatus.data : null);

	function openExternal(
		kind: (typeof externalItems)[number]["kind"],
	): void {
		const url = externalUrl(kind, title, id, trailerId);
		if (!url) {
			return;
		}
		void desktopRpc.request.openExternal({ url });
	}

	async function addWithStatus(status?: ListStatus): Promise<void> {
		if (!discover) {
			return;
		}
		await addFromSearch.mutateAsync({
			mediaId: discover.id,
			...(status ? { status } : {}),
		});
	}

	return (
		<>
			{onInformation ? (
				<Item disabled={disabled} onClick={onInformation}>
					Information
				</Item>
			) : null}

			{isList ? (
				<Item
					disabled={disabled}
					onClick={() => {
						if (!anime) {
							return;
						}
						void navigate({
							to: "/app/search",
							search: { q: anime.title },
						});
					}}
				>
					Search
				</Item>
			) : null}

			<Sub>
				<SubTrigger>External</SubTrigger>
				<SubContent>
					{externalItems.map((item) => (
						<Item
							key={item.kind}
							disabled={disabled}
							onClick={() => {
								openExternal(item.kind);
							}}
						>
							{item.label}
						</Item>
					))}
					{customLinks.map((item) => (
						<Item
							key={`custom-${item.label}-${item.url}`}
							disabled={disabled}
							onClick={() => {
								void desktopRpc.request.openExternal({ url: item.url });
							}}
						>
							{item.label}
						</Item>
					))}
				</SubContent>
			</Sub>

			<Separator />

			{isList ? (
				<>
					{onEdit ? (
						<Item disabled={disabled} onClick={onEdit}>
							Edit...
						</Item>
					) : null}
					<Sub>
						<SubTrigger>Status</SubTrigger>
						<SubContent>
							{listStatusSchema.options.map((status) => (
								<Item
									key={status}
									disabled={disabled || saveEntry.isPending}
									onClick={() => {
										if (!anime) {
											return;
										}
										void saveEntry.mutateAsync({
											animeId: anime.id,
											status,
											progress: anime.episodesWatched,
											notes: anime.notes,
											rewatching: false,
										});
									}}
								>
									{status}
								</Item>
							))}
						</SubContent>
					</Sub>
					{onDelete ? (
						<Item
							disabled={disabled}
							variant="destructive"
							onClick={onDelete}
						>
							Delete from list...
							<Shortcut>Del</Shortcut>
						</Item>
					) : null}
				</>
			) : discoverStatus ? (
				<Item disabled>On list: {discoverStatus}</Item>
			) : (
				<Sub>
					<SubTrigger
						disabled={disabled || addFromSearch.isPending}
						onClick={() => {
							void addWithStatus();
						}}
					>
						Add to list
					</SubTrigger>
					<SubContent>
						{listStatusSchema.options.map((status) => (
							<Item
								key={status}
								disabled={disabled || addFromSearch.isPending}
								onClick={() => {
									void addWithStatus(status);
								}}
							>
								{status}
							</Item>
						))}
					</SubContent>
				</Sub>
			)}

			{!isList ? (
				<>
					<Item
						disabled={disabled || !trailerId}
						onClick={() => {
							openExternal("youtube");
						}}
					>
						Watch trailer
					</Item>
					<Item
						disabled={disabled || id == null}
						onClick={() => {
							openExternal("anilist");
						}}
					>
						View on AniList
					</Item>
				</>
			) : null}

			<Separator />

			{isList ? (
				<>
					<Item
						disabled={disabled || !hasFolder}
						onClick={() => {
							if (!anime?.folder) {
								return;
							}
							void desktopRpc.request.openPath({ path: anime.folder });
						}}
					>
						Open folder
						<Shortcut>Ctrl+O</Shortcut>
					</Item>
					<Item
						disabled={disabled}
						onClick={() => {
							void scan.mutateAsync();
						}}
					>
						Scan available episodes
						<Shortcut>F5</Shortcut>
					</Item>
					<Separator />
					<Sub>
						<SubTrigger>Play episode</SubTrigger>
						<SubContent>
							{localEpisodes.length === 0 ? (
								<Item disabled>No local episodes</Item>
							) : (
								localEpisodes.map((item) => (
									<Item
										key={item.path}
										onClick={() => {
											if (!anime) {
												return;
											}
											void playEpisode.mutateAsync({
												animeId: anime.id,
												episode: item.episode,
											});
										}}
									>
										Episode {item.episode}
									</Item>
								))
							)}
						</SubContent>
					</Sub>
					<Item
						disabled={disabled || lastEpisode <= 0 || localEpisodes.length === 0}
						onClick={() => {
							if (!anime || lastEpisode <= 0) {
								return;
							}
							void playEpisode.mutateAsync({
								animeId: anime.id,
								episode: lastEpisode,
							});
						}}
					>
						Play last episode (#{lastEpisode})
					</Item>
					<Item
						disabled={disabled || localEpisodes.length === 0}
						onClick={() => {
							if (!anime) {
								return;
							}
							void playNext.mutateAsync({
								animeId: anime.id,
								episodesWatched: anime.episodesWatched,
							});
						}}
					>
						Play next episode (#{nextEpisode})
						<Shortcut>Ctrl+N</Shortcut>
					</Item>
					<Item
						disabled={disabled || localEpisodes.length === 0}
						onClick={() => {
							if (!anime) {
								return;
							}
							void playRandom.mutateAsync({ animeId: anime.id });
						}}
					>
						Play random episode
						<Shortcut>Ctrl+R</Shortcut>
					</Item>
					<Separator />
				</>
			) : null}

			<Item
				disabled={disabled || !title}
				onClick={() => {
					void navigate({
						to: "/app/torrents",
					});
				}}
			>
				Torrents
			</Item>

			<Sub>
				<SubTrigger>Copy</SubTrigger>
				<SubContent>
					<Item
						disabled={disabled || !title}
						onClick={() => {
							void copyText(title);
						}}
					>
						Title
					</Item>
					<Item
						disabled={disabled || id == null}
						onClick={() => {
							if (id == null) {
								return;
							}
							void copyText(`https://anilist.co/anime/${id}`);
						}}
					>
						Link
					</Item>
				</SubContent>
			</Sub>
		</>
	);
}
