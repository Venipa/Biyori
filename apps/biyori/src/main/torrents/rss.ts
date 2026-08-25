import { parseSizeBytes } from "./size";

export type RssEntry = {
	guid: string;
	title: string;
	link: string;
	size: string;
	fileSizeBytes: number;
	category: string;
	seeders: number | null;
	leechers: number | null;
	downloads: number | null;
	description: string;
	pubDate: string;
};

function decodeXml(value: string): string {
	return value
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function stripHtml(value: string): string {
	return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tagValue(block: string, tag: string): string {
	const match = block.match(
		new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
	);
	if (!match) {
		return "";
	}
	return decodeXml(
		match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim(),
	);
}

function firstTag(block: string, tags: string[]): string {
	for (const tag of tags) {
		const value = tagValue(block, tag);
		if (value) {
			return value;
		}
	}
	return "";
}

function parseIntSafe(value: string): number | null {
	if (!value) {
		return null;
	}
	const parsed = Number.parseInt(value.replace(/,/g, ""), 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function enclosureLength(block: string): number | null {
	const match = block.match(/<enclosure\b([^>]*)>/i);
	if (!match) {
		return null;
	}
	const length = match[1].match(/\blength=["']?(\d+)/i);
	if (!length) {
		return null;
	}
	const bytes = Number.parseInt(length[1], 10);
	return Number.isFinite(bytes) ? bytes : null;
}

function formatBytes(bytes: number): string {
	const units = ["B", "KiB", "MiB", "GiB", "TiB"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const digits = unit === 0 ? 0 : value >= 10 ? 1 : 2;
	return `${value.toFixed(digits)} ${units[unit]}`;
}

export function parseRssItems(xml: string): RssEntry[] {
	const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
	return blocks.flatMap((block) => {
		const title = tagValue(block, "title");
		const link = tagValue(block, "link");
		const guid = tagValue(block, "guid") || link || title;
		if (!title || !guid) {
			return [];
		}
		const sizeTag = firstTag(block, ["nyaa:size", "size"]);
		const bytes = enclosureLength(block) ?? (sizeTag ? parseSizeBytes(sizeTag) : 0);
		const category = firstTag(block, ["nyaa:category", "category"]);
		return [
			{
				guid,
				title,
				link,
				size: sizeTag || (bytes > 0 ? formatBytes(bytes) : ""),
				fileSizeBytes: bytes,
				category,
				seeders: parseIntSafe(
					firstTag(block, ["nyaa:seeders", "seeders", "torrent:seeds"]),
				),
				leechers: parseIntSafe(
					firstTag(block, ["nyaa:leechers", "leechers", "torrent:peers"]),
				),
				downloads: parseIntSafe(
					firstTag(block, ["nyaa:downloads", "downloads"]),
				),
				description: stripHtml(tagValue(block, "description")),
				pubDate: tagValue(block, "pubDate") || tagValue(block, "pubdate"),
			},
		];
	});
}
