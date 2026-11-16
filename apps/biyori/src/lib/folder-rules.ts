import { isPathInsideFolder } from "./folder-path";
import type { FolderRule } from "./schemas/folder-rule";

type RuleFields = Pick<FolderRule, "path" | "season" | "from" | "to" | "animeId" | "offset">;

/** First rule covering the file wins. A file without a parsed season counts as season 1. */
export function applyFolderRules(rules: readonly RuleFields[], file: { path: string; season: number | null; episode: number }): { animeId: number; episode: number } | null {
	for (const rule of rules) {
		if (!isPathInsideFolder(file.path, rule.path)) {
			continue;
		}
		if (rule.season != null && (file.season ?? 1) !== rule.season) {
			continue;
		}
		if (file.episode < rule.from || (rule.to != null && file.episode > rule.to)) {
			continue;
		}
		const episode = file.episode + rule.offset;
		if (episode < 0) {
			continue;
		}
		return { animeId: rule.animeId, episode };
	}
	return null;
}
