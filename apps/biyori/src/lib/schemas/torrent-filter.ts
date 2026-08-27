import { z } from "zod";

export const torrentFilterActionSchema = z.enum(["discard", "select", "prefer"]);
export const torrentFilterMatchSchema = z.enum(["all", "any"]);
export const torrentFilterOptionSchema = z.enum(["default", "deactivate", "hide"]);
export const torrentFilterElementSchema = z.enum([
	"meta_id",
	"meta_status",
	"meta_type",
	"meta_episodes",
	"meta_date_start",
	"meta_date_end",
	"user_notes",
	"user_status",
	"local_episode_available",
	"episode_title",
	"episode_number",
	"episode_version",
	"episode_group",
	"episode_video_resolution",
	"episode_video_type",
	"file_title",
	"file_category",
	"file_description",
	"file_link",
	"file_size",
]);
export const torrentFilterOperatorSchema = z.enum(["equals", "not_equals", "gt", "gte", "lt", "lte", "begins_with", "ends_with", "contains", "not_contains"]);

export const torrentFilterConditionSchema = z.object({
	element: torrentFilterElementSchema,
	op: torrentFilterOperatorSchema,
	value: z.string(),
});

export const torrentFilterSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	enabled: z.boolean(),
	action: torrentFilterActionSchema,
	match: torrentFilterMatchSchema,
	option: torrentFilterOptionSchema,
	animeIds: z.array(z.number().int()),
	conditions: z.array(torrentFilterConditionSchema),
});

export type TorrentFilter = z.infer<typeof torrentFilterSchema>;
export type TorrentFilterCondition = z.infer<typeof torrentFilterConditionSchema>;
export type TorrentFilterAction = z.infer<typeof torrentFilterActionSchema>;
export type TorrentFilterElement = z.infer<typeof torrentFilterElementSchema>;
export type TorrentFilterOperator = z.infer<typeof torrentFilterOperatorSchema>;
export type TorrentFilterMatch = z.infer<typeof torrentFilterMatchSchema>;
export type TorrentFilterOption = z.infer<typeof torrentFilterOptionSchema>;

export const torrentItemStateSchema = z.enum(["blank", "discarded_normal", "discarded_inactive", "discarded_hidden", "selected"]);
export type TorrentItemState = z.infer<typeof torrentItemStateSchema>;

function filter(input: {
	id: string;
	name: string;
	action: TorrentFilterAction;
	match: TorrentFilterMatch;
	option?: TorrentFilterOption;
	conditions: TorrentFilterCondition[];
}): TorrentFilter {
	return {
		id: input.id,
		name: input.name,
		enabled: true,
		action: input.action,
		match: input.match,
		option: input.option ?? "default",
		animeIds: [],
		conditions: input.conditions,
	};
}

export function defaultTorrentFilters(): TorrentFilter[] {
	return [
		filter({
			id: "select-watching",
			name: "Select currently watching",
			action: "select",
			match: "any",
			conditions: [
				{
					element: "user_status",
					op: "equals",
					value: "Currently watching",
				},
			],
		}),
		filter({
			id: "select-airing-plan",
			name: "Select airing anime in plan to watch",
			action: "select",
			match: "all",
			conditions: [
				{
					element: "meta_status",
					op: "equals",
					value: "Currently airing",
				},
				{
					element: "user_status",
					op: "equals",
					value: "Plan to watch",
				},
			],
		}),
		filter({
			id: "discard-dropped",
			name: "Discard dropped",
			action: "discard",
			match: "all",
			conditions: [
				{
					element: "user_status",
					op: "equals",
					value: "Dropped",
				},
			],
		}),
		filter({
			id: "discard-not-in-list",
			name: "Discard and deactivate not-in-list anime",
			action: "discard",
			match: "any",
			option: "deactivate",
			conditions: [
				{
					element: "user_status",
					op: "equals",
					value: "Not in list",
				},
			],
		}),
		filter({
			id: "discard-watched-available",
			name: "Discard watched and available episodes",
			action: "discard",
			match: "any",
			conditions: [
				{
					element: "episode_number",
					op: "lte",
					value: "%watched%",
				},
				{
					element: "local_episode_available",
					op: "equals",
					value: "True",
				},
			],
		}),
		filter({
			id: "prefer-1080p",
			name: "Prefer high-resolution files",
			action: "prefer",
			match: "any",
			conditions: [
				{
					element: "episode_video_resolution",
					op: "equals",
					value: "1080p",
				},
			],
		}),
	];
}

export const TORRENT_FILTER_ELEMENT_LABELS: Record<TorrentFilterElement, string> = {
	meta_id: "Anime ID",
	meta_status: "Anime airing status",
	meta_type: "Anime type",
	meta_episodes: "Anime episode count",
	meta_date_start: "Anime date started",
	meta_date_end: "Anime date ended",
	user_notes: "Anime notes",
	user_status: "Anime watching status",
	local_episode_available: "Episode availability",
	episode_title: "Episode title",
	episode_number: "Episode number",
	episode_version: "Episode version",
	episode_group: "Episode fansub group",
	episode_video_resolution: "Episode video resolution",
	episode_video_type: "Episode video type",
	file_title: "File name",
	file_category: "File category",
	file_description: "File description",
	file_link: "File link",
	file_size: "File size",
};

export const TORRENT_FILTER_OPERATOR_LABELS: Record<TorrentFilterOperator, string> = {
	equals: "is",
	not_equals: "is not",
	gt: "is greater than",
	gte: "is greater than or equal to",
	lt: "is less than",
	lte: "is less than or equal to",
	begins_with: "begins with",
	ends_with: "ends with",
	contains: "contains",
	not_contains: "does not contain",
};

export const TORRENT_FILTER_ACTION_LABELS: Record<TorrentFilterAction, string> = {
	discard: "Discard matched items",
	select: "Select matched items",
	prefer: "Prefer matched items to similar ones",
};

export const TORRENT_FILTER_MATCH_LABELS: Record<TorrentFilterMatch, string> = {
	all: "All conditions",
	any: "Any condition",
};

export const TORRENT_FILTER_OPTION_LABELS: Record<TorrentFilterOption, string> = {
	default: "Default",
	deactivate: "Deactivate discarded items",
	hide: "Hide discarded items",
};

export function cloneTorrentFilter(row: TorrentFilter, id: string = crypto.randomUUID()): TorrentFilter {
	return {
		...row,
		id,
		animeIds: [...row.animeIds],
		conditions: row.conditions.map((condition) => ({ ...condition })),
	};
}

export function blankTorrentFilter(): TorrentFilter {
	return {
		id: crypto.randomUUID(),
		name: "",
		enabled: true,
		action: "discard",
		match: "all",
		option: "default",
		animeIds: [],
		conditions: [],
	};
}

export type TorrentFilterWizardPreset = {
	id: string;
	name: string;
	description: string;
	filter: TorrentFilter | null;
};

export function torrentFilterWizardPresets(): TorrentFilterWizardPreset[] {
	return [
		{
			id: "custom",
			name: "(Custom)",
			description: "Lets you create a custom filter from scratch",
			filter: null,
		},
		{
			id: "fansub",
			name: "[Fansub] Anime",
			description: "Lets you choose a fansub group for one or more anime",
			filter: filter({
				id: "preset-fansub",
				name: "[Fansub] Anime",
				action: "prefer",
				match: "all",
				conditions: [
					{
						element: "episode_group",
						op: "equals",
						value: "TaigaSubs (change this)",
					},
				],
			}),
		},
		{
			id: "bad-keywords",
			name: "Discard bad video keywords",
			description: "Discards everything that is AVI, DIVX, LQ, RMVB, SD, WMV or XVID",
			filter: filter({
				id: "preset-bad-keywords",
				name: "Discard bad video keywords",
				action: "discard",
				match: "any",
				conditions: [
					{ element: "episode_video_type", op: "contains", value: "AVI" },
					{ element: "episode_video_type", op: "contains", value: "DIVX" },
					{ element: "episode_video_type", op: "contains", value: "LQ" },
					{ element: "episode_video_type", op: "contains", value: "RMVB" },
					{ element: "episode_video_type", op: "contains", value: "SD" },
					{ element: "episode_video_type", op: "contains", value: "WMV" },
					{ element: "episode_video_type", op: "contains", value: "XVID" },
				],
			}),
		},
		{
			id: "new-versions",
			name: "Prefer new versions",
			description: "Prefers v2 files and above when there are earlier releases of the same episode as well",
			filter: filter({
				id: "preset-new-versions",
				name: "Prefer new versions",
				action: "prefer",
				match: "any",
				conditions: [{ element: "episode_version", op: "gt", value: "1" }],
			}),
		},
	];
}

export const torrentFilterExportSchema = z.object({
	kind: z.literal("torrent-filters"),
	filters: z.array(torrentFilterSchema),
});

export function parseTorrentFilterExport(value: unknown): TorrentFilter[] | null {
	const parsed = torrentFilterExportSchema.safeParse(value);
	return parsed.success ? parsed.data.filters : null;
}

export const torrentFiltersFileSchema = z.object({
	enabled: z.boolean().default(true),
	filters: z.array(torrentFilterSchema),
});

export type TorrentFiltersFile = z.output<typeof torrentFiltersFileSchema>;

export const torrentFiltersFileDefaultValues: TorrentFiltersFile = {
	enabled: true,
	filters: defaultTorrentFilters(),
};

function coerceTorrentFilters(value: unknown): TorrentFilter[] {
	if (!Array.isArray(value)) {
		return torrentFiltersFileDefaultValues.filters;
	}
	const parsed = z.array(torrentFilterSchema).safeParse(value);
	if (parsed.success) {
		return parsed.data;
	}
	const kept = value.flatMap((item) => {
		const row = torrentFilterSchema.safeParse(item);
		return row.success ? [row.data] : [];
	});
	return kept.length > 0 || value.length === 0 ? kept : torrentFiltersFileDefaultValues.filters;
}

export function parseTorrentFiltersFile(value: unknown): TorrentFiltersFile {
	const direct = torrentFiltersFileSchema.safeParse(value);
	if (direct.success) {
		return direct.data;
	}
	const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
	return torrentFiltersFileSchema.parse({
		enabled: typeof record.enabled === "boolean" ? record.enabled : true,
		filters: coerceTorrentFilters(record.filters),
	});
}
