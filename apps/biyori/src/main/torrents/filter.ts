import type {
	TorrentFilter,
	TorrentFilterCondition,
	TorrentFilterOperator,
	TorrentItemState,
} from "../../lib/schemas/torrent-filter";
import { parseSizeBytes, resolutionHeight } from "./size";

export type TorrentFilterSubject = {
	title: string;
	category: string;
	description: string;
	link: string;
	fileSizeBytes: number;
	animeId: number | null;
	animeTitle: string;
	dateStart: string;
	dateEnd: string;
	episodes: number;
	airingStatus: string;
	type: string;
	notes: string;
	userStatus: string;
	episodeHigh: number;
	episodeLow: number;
	releaseVersion: number;
	episodeAvailable: boolean;
	group: string;
	videoResolution: string;
	videoTerms: string;
	watched: number;
};

export type TorrentFilterItem = {
	id: string;
	state: TorrentItemState;
	subject: TorrentFilterSubject;
};

const NUMERIC_ELEMENTS = new Set([
	"file_size",
	"meta_id",
	"meta_episodes",
	"episode_number",
	"episode_version",
	"local_episode_available",
]);

function compareOp(
	left: number,
	right: number,
	op: TorrentFilterOperator,
): boolean {
	switch (op) {
		case "equals":
			return left === right;
		case "not_equals":
			return left !== right;
		case "gt":
			return left > right;
		case "gte":
			return left >= right;
		case "lt":
			return left < right;
		case "lte":
			return left <= right;
		default:
			return false;
	}
}

function equalText(left: string, right: string): boolean {
	return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
}

function containsText(haystack: string, needle: string): boolean {
	return haystack.toLowerCase().includes(needle.toLowerCase());
}

function replaceVars(value: string, subject: TorrentFilterSubject): string {
	return value.replace(/%watched%/gi, String(subject.watched));
}

function elementValue(
	condition: TorrentFilterCondition,
	subject: TorrentFilterSubject,
): string {
	switch (condition.element) {
		case "file_title":
			return subject.title;
		case "file_category":
			return subject.category;
		case "file_description":
			return subject.description;
		case "file_link":
			return subject.link;
		case "file_size":
			return String(subject.fileSizeBytes);
		case "meta_id":
			return subject.animeId != null ? String(subject.animeId) : "";
		case "episode_title":
			return subject.animeTitle;
		case "meta_date_start":
			return subject.dateStart;
		case "meta_date_end":
			return subject.dateEnd;
		case "meta_episodes":
			return String(subject.episodes);
		case "meta_status":
			return subject.airingStatus;
		case "meta_type":
			return subject.type;
		case "user_notes":
			return subject.notes;
		case "user_status":
			return subject.userStatus;
		case "episode_number":
			return subject.episodeHigh > 0
				? String(subject.episodeHigh)
				: subject.episodes > 0
					? String(subject.episodes)
					: "";
		case "episode_version":
			return String(subject.releaseVersion);
		case "local_episode_available":
			return subject.episodeAvailable ? "1" : "0";
		case "episode_group":
			return subject.group;
		case "episode_video_resolution":
			return subject.videoResolution;
		case "episode_video_type":
			return subject.videoTerms;
		default:
			return "";
	}
}

function isNumeric(element: TorrentFilterCondition["element"]): boolean {
	return NUMERIC_ELEMENTS.has(element);
}

export function evaluateCondition(
	condition: TorrentFilterCondition,
	subject: TorrentFilterSubject,
): boolean {
	const element = elementValue(condition, subject);
	const value = replaceVars(condition.value, subject);
	if (isNumeric(condition.element) && (!element || !value)) {
		return false;
	}

	if (
		condition.op === "equals" ||
		condition.op === "not_equals" ||
		condition.op === "gt" ||
		condition.op === "gte" ||
		condition.op === "lt" ||
		condition.op === "lte"
	) {
		if (condition.element === "file_size") {
			return compareOp(
				Number.parseInt(element, 10) || 0,
				parseSizeBytes(value),
				condition.op,
			);
		}
		if (condition.element === "episode_video_resolution") {
			return compareOp(
				resolutionHeight(element),
				resolutionHeight(value),
				condition.op,
			);
		}
		if (isNumeric(condition.element)) {
			if (condition.op === "equals" || condition.op === "not_equals") {
				if (equalText(value, "True")) {
					return compareOp(Number.parseInt(element, 10) || 0, 1, condition.op);
				}
			}
			return compareOp(
				Number.parseInt(element, 10) || 0,
				Number.parseInt(value, 10) || 0,
				condition.op,
			);
		}
		if (condition.op === "equals" || condition.op === "not_equals") {
			return compareOp(equalText(element, value) ? 1 : 0, 1, condition.op);
		}
		return compareOp(element.localeCompare(value), 0, condition.op);
	}
	if (condition.op === "begins_with") {
		return element.toLowerCase().startsWith(value.toLowerCase());
	}
	if (condition.op === "ends_with") {
		return element.toLowerCase().endsWith(value.toLowerCase());
	}
	if (condition.op === "contains") {
		return containsText(element, value);
	}
	return !containsText(element, value);
}

function isDiscarded(state: TorrentItemState): boolean {
	return (
		state === "discarded_normal" ||
		state === "discarded_inactive" ||
		state === "discarded_hidden"
	);
}

function discardState(option: TorrentFilter["option"]): TorrentItemState {
	if (option === "deactivate") {
		return "discarded_inactive";
	}
	if (option === "hide") {
		return "discarded_hidden";
	}
	return "discarded_normal";
}

function conditionsMatch(
	filter: TorrentFilter,
	subject: TorrentFilterSubject,
): { matched: boolean; index: number } {
	if (filter.match === "all") {
		for (let i = 0; i < filter.conditions.length; i += 1) {
			if (!evaluateCondition(filter.conditions[i], subject)) {
				return { matched: false, index: i };
			}
		}
		return { matched: true, index: 0 };
	}
	for (let i = 0; i < filter.conditions.length; i += 1) {
		if (evaluateCondition(filter.conditions[i], subject)) {
			return { matched: true, index: i };
		}
	}
	return { matched: false, index: 0 };
}

function samePreferenceGroup(
	filter: TorrentFilter,
	left: TorrentFilterSubject,
	right: TorrentFilterSubject,
): boolean {
	const has = (element: TorrentFilterCondition["element"]): boolean =>
		filter.conditions.some((condition) => condition.element === element);
	if (!has("meta_id") && !has("episode_title")) {
		if (left.animeId == null && right.animeId == null) {
			if (!equalText(left.animeTitle, right.animeTitle)) {
				return false;
			}
		} else if (left.animeId !== right.animeId) {
			return false;
		}
	}
	if (!has("episode_number")) {
		if (
			left.episodeLow !== right.episodeLow ||
			left.episodeHigh !== right.episodeHigh
		) {
			return false;
		}
	}
	if (!has("episode_group") && !equalText(left.group, right.group)) {
		return false;
	}
	return true;
}

export function applyFilter(
	filter: TorrentFilter,
	items: TorrentFilterItem[],
	item: TorrentFilterItem,
	recursive: boolean,
): boolean {
	if (!filter.enabled || isDiscarded(item.state)) {
		return false;
	}
	if (
		filter.animeIds.length > 0 &&
		(item.subject.animeId == null ||
			!filter.animeIds.includes(item.subject.animeId))
	) {
		return false;
	}

	const { matched } = conditionsMatch(filter, item.subject);

	if (filter.action === "discard") {
		if (!matched) {
			return false;
		}
		item.state = discardState(filter.option);
		return true;
	}
	if (filter.action === "select") {
		if (!matched) {
			return false;
		}
		item.state = "selected";
		return true;
	}

	if (recursive) {
		if (filter.animeIds.length > 0) {
			item.state = matched ? "selected" : discardState(filter.option);
			return true;
		}
		if (!matched) {
			return false;
		}
		return applyPreferenceFilter(filter, items, item);
	}
	if (!matched) {
		item.state = discardState(filter.option);
		return true;
	}
	return false;
}

export function applyPreferenceFilter(
	filter: TorrentFilter,
	items: TorrentFilterItem[],
	item: TorrentFilterItem,
): boolean {
	let applied = false;
	for (const peer of items) {
		if (isDiscarded(peer.state) || peer.id === item.id) {
			continue;
		}
		if (!samePreferenceGroup(filter, peer.subject, item.subject)) {
			continue;
		}
		applied = applyFilter(filter, items, peer, false) || applied;
	}
	return applied;
}

export function applyTorrentFilters(
	items: TorrentFilterItem[],
	filters: TorrentFilter[],
	enabled: boolean,
): TorrentFilterItem[] {
	if (!enabled) {
		return items;
	}
	for (const item of items) {
		for (const filter of filters) {
			if (filter.action !== "prefer") {
				applyFilter(filter, items, item, true);
			}
		}
	}
	for (const item of items) {
		for (const filter of filters) {
			if (filter.action === "prefer") {
				applyFilter(filter, items, item, true);
			}
		}
	}
	return items;
}

export function applyArchiveFilter(
	items: TorrentFilterItem[],
	archivedTitles: Set<string>,
): TorrentFilterItem[] {
	for (const item of items) {
		if (!isDiscarded(item.state) && archivedTitles.has(item.subject.title)) {
			item.state = "discarded_normal";
		}
	}
	return items;
}

const STATE_RANK: Record<TorrentItemState, number> = {
	selected: 0,
	blank: 1,
	discarded_normal: 2,
	discarded_inactive: 3,
	discarded_hidden: 4,
};

export function compareTorrentState(
	left: TorrentItemState,
	right: TorrentItemState,
): number {
	return STATE_RANK[left] - STATE_RANK[right];
}

export function addDiscardAnimeFilter(
	filters: TorrentFilter[],
	animeId: number,
	title: string,
): TorrentFilter[] {
	if (
		filters.some(
			(filter) =>
				filter.action === "discard" &&
				filter.conditions.length === 1 &&
				filter.conditions[0].element === "meta_id" &&
				filter.conditions[0].value === String(animeId),
		)
	) {
		return filters;
	}
	return [
		...filters,
		{
			id: `discard-${animeId}`,
			name: `Discard "${title}"`,
			enabled: true,
			action: "discard",
			match: "all",
			option: "default",
			animeIds: [],
			conditions: [
				{
					element: "meta_id",
					op: "equals",
					value: String(animeId),
				},
			],
		},
	];
}

export function setFansubFilter(
	filters: TorrentFilter[],
	animeId: number,
	group: string,
	title: string,
): TorrentFilter[] {
	const next = filters.map((filter) => ({
		...filter,
		animeIds: [...filter.animeIds],
		conditions: filter.conditions.map((condition) => ({ ...condition })),
	}));
	const existing = next.find(
		(filter) =>
			filter.action === "prefer" &&
			filter.animeIds.includes(animeId) &&
			filter.conditions.some((condition) => condition.element === "episode_group"),
	);
	if (existing) {
		if (existing.animeIds.length > 1) {
			existing.animeIds = existing.animeIds.filter((id) => id !== animeId);
		} else {
			const groupCondition = existing.conditions.find(
				(condition) => condition.element === "episode_group",
			);
			if (groupCondition) {
				groupCondition.value = group;
			}
			return next;
		}
	}
	return [
		...next.filter((filter) => filter !== existing || filter.animeIds.length > 0),
		{
			id: `fansub-${animeId}`,
			name: `[Fansub] ${title}`,
			enabled: true,
			action: "prefer",
			match: "all",
			option: "default",
			animeIds: [animeId],
			conditions: [
				{
					element: "episode_group",
					op: "equals",
					value: group,
				},
			],
		},
	];
}
