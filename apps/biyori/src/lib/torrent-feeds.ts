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

export function fillTorrentSearchUrl(template: string, title: string): string {
	return template.replace(/%title%/g, encodeURIComponent(title));
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
