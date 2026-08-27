import semver from "semver";
import { z } from "zod";
import { cleanSemver, isVersionAllowedOnChannel, type ReleaseNoteEntry, type UpdateChannel } from "../shared/updater";

export const githubReleaseSchema = z.object({
	tag_name: z.string(),
	name: z.string().nullable(),
	body: z.string().nullable(),
	prerelease: z.boolean(),
	draft: z.boolean(),
	html_url: z.string(),
	published_at: z.string().nullable(),
});

export type GithubRelease = z.infer<typeof githubReleaseSchema>;

const FULL_CHANGELOG_LINK = /(?:\*{2})?Full Changelog(?:\*{2})?:\s+(https:\/\/github\.com\/[^\s]+)/gi;

export function preprocessReleaseNotes(content: string): string {
	return content.replace(FULL_CHANGELOG_LINK, "[View on GitHub]($1)");
}

const HTTP_DUMP = /\s*(?:Headers|Data|XML)\s*:[\s\S]*$/i;

export function sanitizeUpdateError(error: unknown, fallback = "Update check failed"): string {
	const raw = error instanceof Error ? error.message : String(error);
	if (/Unable to find latest version on GitHub/i.test(raw) || /HttpError:\s*406/i.test(raw)) {
		return "No production GitHub release found for this channel";
	}
	const firstLine = raw.split("\n")[0]?.replace(HTTP_DUMP, "").trim() ?? "";
	if (!firstLine || firstLine.length > 180 || /set-cookie|content-security-policy/i.test(firstLine)) {
		return fallback;
	}
	return firstLine;
}

export function parseGithubChangelog(payload: unknown, channel: UpdateChannel): { ok: true; items: ReleaseNoteEntry[] } | { ok: false; error: string } {
	const parsed = z.array(githubReleaseSchema).safeParse(payload);
	if (!parsed.success) {
		return { ok: false, error: "Could not load changelog" };
	}
	const items: ReleaseNoteEntry[] = [];
	for (const release of parsed.data) {
		if (release.draft) {
			continue;
		}
		if (channel === "stable" && release.prerelease) {
			continue;
		}
		const version = cleanSemver(release.tag_name);
		if (!version || !isVersionAllowedOnChannel(version, channel)) {
			continue;
		}
		items.push({
			version,
			name: release.name,
			body: release.body ? preprocessReleaseNotes(release.body) : release.body,
			publishedAt: release.published_at,
			prerelease: release.prerelease,
		});
	}
	items.sort((a, b) => semver.rcompare(a.version, b.version, { loose: true }));
	return { ok: true, items };
}
