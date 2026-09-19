export type TorrentFeedOption = {
	value: string;
	label: string;
};

export const TORRENT_RELEASE_FEEDS: TorrentFeedOption[] = [
	{
		value: "https://nyaa.si/?page=rss&c=1_2&f=0",
		label: "Nyaa.si",
	},
	{
		value: "https://subsplease.org/rss/?t&r=1080",
		label: "SubsPlease 1080p",
	},
	{
		value: "https://www.tokyotosho.info/rss.php?filter=1,11&zwnj=0",
		label: "TokyoToshokan",
	},
	{
		value: "https://anidex.info/rss/?cat=1&lang_id=1",
		label: "AniDex",
	},
	{
		value: "https://nyaa.net/feed?c=3_5&s=0",
		label: "Nyaa.net",
	},
];

export const TORRENT_SEARCH_FEEDS: TorrentFeedOption[] = [
	{
		value: "https://nyaa.si/?page=rss&c=1_2&f=0&q=%title%",
		label: "Nyaa.si",
	},
	{
		value: "https://anidex.info/rss/?cat=1&lang_id=1&q=%title%",
		label: "AniDex",
	},
	{
		value: "https://nyaa.net/feed?c=3_5&s=0&q=%title%",
		label: "Nyaa.net",
	},
];

export function torrentSearchUrlForFeed(rssFeedUrl: string): string {
	const release = TORRENT_RELEASE_FEEDS.find((option) => option.value === rssFeedUrl);
	if (!release) {
		return "";
	}
	return TORRENT_SEARCH_FEEDS.find((option) => option.label === release.label)?.value ?? "";
}

export function fillTorrentSearchUrl(template: string, title: string): string {
	if (template.includes("%title%")) {
		return template.replace(/%title%/g, encodeURIComponent(title));
	}
	try {
		const url = new URL(template);
		url.searchParams.set("q", title);
		return url.toString();
	} catch {
		return template;
	}
}

function isHttpUrl(value: string): boolean {
	try {
		const parsed = new URL(value.replace(/%title%/g, "title"));
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

export function isTorrentFeedUrl(value: string): boolean {
	return value.length === 0 || isHttpUrl(value);
}
