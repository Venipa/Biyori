import { t, useTranslation } from "@biyori/translations/react";
import { useNavigate } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { desktopRpc } from "@/desktop-rpc";
import { listStatusLabel } from "@/mainview/components/app/anime/list-action";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import type { SelectedAnime } from "@/mainview/lib/selected-anime";
import { trpc } from "@/mainview/trpc";
import { type ListStatus, listStatusSchema } from "@/shared/list";

function parseCustomExternalLinks(raw: string, title: string, id: number | null): Array<{ label: string; url: string }> {
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
		const url = template.replace(/%title%/g, encodeURIComponent(title)).replace(/%id%/g, id != null ? String(id) : "");
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
	kind: "anilist" | "anidb" | "ann" | "mal" | "reddit" | "wikipedia" | "youtube" | "google",
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

function externalLabel(kind: (typeof externalItems)[number]["kind"]): string {
	switch (kind) {
		case "anilist":
			return t("anime.anilist");
		case "anidb":
			return t("anime.anidb");
		case "ann":
			return t("anime.animeNewsNetwork");
		case "mal":
			return t("anime.myAnimeList");
		case "reddit":
			return t("anime.reddit");
		case "wikipedia":
			return t("anime.wikipedia");
		case "youtube":
			return t("anime.youtube");
		case "google":
			return t("anime.google");
	}
}

const externalItems = [
	{ kind: "anilist" as const },
	{ kind: "anidb" as const },
	{ kind: "ann" as const },
	{ kind: "mal" as const },
	{ kind: "reddit" as const },
	{ kind: "wikipedia" as const },
	{ kind: "youtube" as const },
	{ kind: "google" as const },
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
	showPlayNext = false,
}: {
	parts: MenuParts;
	mode?: "list" | "discover" | "now-playing";
	anime?: SelectedAnime | null;
	discover?: DiscoverAnimeTarget | null;
	onInformation?: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
	showPlayNext?: boolean;
}) {
	const { Item, Sub, SubTrigger, SubContent, Separator, Shortcut } = parts;
	const { t } = useTranslation();
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const isList = mode === "list";
	const isNowPlaying = mode === "now-playing";
	const useLibrary = isList || isNowPlaying;
	const title = isList || isNowPlaying ? (anime?.title ?? "") : (discover?.title ?? "");
	const id = isList || isNowPlaying ? (anime?.id ?? null) : (discover?.id ?? null);
	const trailerId = discover?.trailerId ?? null;
	const disabled = isList || isNowPlaying ? anime == null : discover == null;
	const nextEpisode = anime ? Math.min(anime.episodesWatched + 1, anime.episodes || anime.episodesWatched + 1) : 1;
	const lastEpisode = anime?.episodesWatched ?? 0;
	const hasFolder = Boolean(anime?.folder);
	const episodesQuery = trpc.library.episodes.useQuery({ animeId: anime?.id ?? 0 }, { enabled: Boolean(useLibrary && anime?.id) });
	const scan = trpc.library.scan.useMutation();
	const playEpisode = trpc.library.playEpisode.useMutation();
	const playNext = trpc.library.playNext.useMutation();
	const playRandom = trpc.library.playRandom.useMutation();
	const searchTorrents = trpc.torrents.search.useMutation({
		onSuccess: (next) => {
			utils.torrents.list.setData(undefined, next);
		},
	});
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
	const customLinks = parseCustomExternalLinks(settingsQuery.data?.externalLinks ?? "", title, id);
	const matchedList = listLookup.data?.find((row) => row.id === discover?.id);
	const matchedStatus = matchedList ? listStatusSchema.safeParse(matchedList.status) : null;
	const discoverStatus = discover?.listStatus ?? (matchedStatus?.success ? matchedStatus.data : null);

	function openTorrentSearch(): void {
		if (!title) {
			return;
		}
		void searchTorrents.mutateAsync({ title }).then(() => {
			void navigate({ to: "/app/torrents" });
		});
	}

	function openExternal(kind: (typeof externalItems)[number]["kind"]): void {
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

	if (isNowPlaying) {
		return (
			<>
				{showPlayNext ? (
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
						}}>
						{t("anime.playNext", { episode: nextEpisode })}
						<Shortcut>{t("anime.shortcutCtrlN")}</Shortcut>
					</Item>
				) : null}
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
					}}>
					{t("common.search")}
				</Item>
				<Item disabled={disabled || !title} onClick={openTorrentSearch}>
					{t("anime.searchTorrents")}
				</Item>
				{onEdit ? (
					<Item disabled={disabled} onClick={onEdit}>
						{t("anime.edit")}
					</Item>
				) : null}
				<Item
					disabled={disabled}
					onClick={() => {
						void scan.mutateAsync();
					}}>
					{t("anime.scanAvailable")}
					<Shortcut>{t("anime.shortcutF5")}</Shortcut>
				</Item>
				<Sub>
					<SubTrigger>{t("anime.playEpisode")}</SubTrigger>
					<SubContent>
						{localEpisodes.length === 0 ? (
							<Item disabled>{t("anime.noLocalEpisodes")}</Item>
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
									}}>
									{t("nowPlaying.episodeNumber", { episode: item.episode })}
								</Item>
							))
						)}
					</SubContent>
				</Sub>
			</>
		);
	}

	return (
		<>
			{onInformation ? (
				<Item disabled={disabled} onClick={onInformation}>
					{t("anime.information")}
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
					}}>
					{t("common.search")}
				</Item>
			) : null}

			<Sub>
				<SubTrigger>{t("anime.external")}</SubTrigger>
				<SubContent>
					{externalItems.map((item) => (
						<Item
							key={item.kind}
							disabled={disabled}
							onClick={() => {
								openExternal(item.kind);
							}}>
							{externalLabel(item.kind)}
						</Item>
					))}
					{customLinks.map((item) => (
						<Item
							key={`custom-${item.label}-${item.url}`}
							disabled={disabled}
							onClick={() => {
								void desktopRpc.request.openExternal({ url: item.url });
							}}>
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
							{t("anime.edit")}
						</Item>
					) : null}
					<Sub>
						<SubTrigger>{t("anime.status")}</SubTrigger>
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
									}}>
									{listStatusLabel(status)}
								</Item>
							))}
						</SubContent>
					</Sub>
					{onDelete ? (
						<Item disabled={disabled} variant='destructive' onClick={onDelete}>
							{t("anime.deleteFromListMenu")}
							<Shortcut>{t("anime.shortcutDel")}</Shortcut>
						</Item>
					) : null}
				</>
			) : discoverStatus ? (
				<Item disabled>{t("anime.onList", { status: listStatusLabel(discoverStatus) })}</Item>
			) : (
				<Sub>
					<SubTrigger
						disabled={disabled || addFromSearch.isPending}
						onClick={() => {
							void addWithStatus();
						}}>
						{t("anime.addToList")}
					</SubTrigger>
					<SubContent>
						{listStatusSchema.options.map((status) => (
							<Item
								key={status}
								disabled={disabled || addFromSearch.isPending}
								onClick={() => {
									void addWithStatus(status);
								}}>
								{listStatusLabel(status)}
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
						}}>
						{t("anime.watchTrailer")}
					</Item>
					<Item
						disabled={disabled || id == null}
						onClick={() => {
							openExternal("anilist");
						}}>
						{t("anime.viewOnAnilist")}
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
						}}>
						{t("anime.openFolder")}
						<Shortcut>{t("anime.shortcutCtrlO")}</Shortcut>
					</Item>
					<Item
						disabled={disabled}
						onClick={() => {
							void scan.mutateAsync();
						}}>
						{t("anime.scanAvailable")}
						<Shortcut>{t("anime.shortcutF5")}</Shortcut>
					</Item>
					<Separator />
					<Sub>
						<SubTrigger>{t("anime.playEpisode")}</SubTrigger>
						<SubContent>
							{localEpisodes.length === 0 ? (
								<Item disabled>{t("anime.noLocalEpisodes")}</Item>
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
										}}>
										{t("nowPlaying.episodeNumber", { episode: item.episode })}
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
						}}>
						{t("anime.playLast", { episode: lastEpisode })}
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
						}}>
						{t("anime.playNext", { episode: nextEpisode })}
						<Shortcut>{t("anime.shortcutCtrlN")}</Shortcut>
					</Item>
					<Item
						disabled={disabled || localEpisodes.length === 0}
						onClick={() => {
							if (!anime) {
								return;
							}
							void playRandom.mutateAsync({ animeId: anime.id });
						}}>
						{t("anime.playRandom")}
						<Shortcut>{t("anime.shortcutCtrlR")}</Shortcut>
					</Item>
					<Separator />
				</>
			) : null}

			<Item disabled={disabled || !title} onClick={openTorrentSearch}>
				{t("anime.torrents")}
			</Item>

			<Sub>
				<SubTrigger>{t("anime.copy")}</SubTrigger>
				<SubContent>
					<Item
						disabled={disabled || !title}
						onClick={() => {
							void copyText(title);
						}}>
						{t("list.title")}
					</Item>
					<Item
						disabled={disabled || id == null}
						onClick={() => {
							if (id == null) {
								return;
							}
							void copyText(`https://anilist.co/anime/${id}`);
						}}>
						{t("anime.link")}
					</Item>
				</SubContent>
			</Sub>
		</>
	);
}
