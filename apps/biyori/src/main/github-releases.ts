import { t } from "@biyori/translations/i18n";
import { compareReversed, isGreaterThanRange } from "verkit";
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
	return content.replace(FULL_CHANGELOG_LINK, `[${t("main.update.viewOnGitHub")}]($1)`);
}

const HTTP_DUMP = /\s*(?:Headers|Data|XML)\s*:[\s\S]*$/i;

export function sanitizeUpdateError(error: unknown, fallback = t("main.update.checkFailed")): string {
	const raw = error instanceof Error ? error.message : String(error);
	if (/Unable to find latest version on GitHub/i.test(raw) || /HttpError:\s*406/i.test(raw)) {
		return t("main.update.noRelease");
	}
	const firstLine = raw.split("\n")[0]?.replace(HTTP_DUMP, "").trim() ?? "";
	if (!firstLine || firstLine.length > 180 || /set-cookie|content-security-policy/i.test(firstLine)) {
		return fallback;
	}
	return firstLine;
}

/** Published releases allowed on `channel`, newest first; null when the payload is not a release list. */
function channelReleases(payload: unknown, channel: UpdateChannel): Array<GithubRelease & { version: string }> | null {
	const parsed = z.array(githubReleaseSchema).safeParse(payload);
	if (!parsed.success) {
		return null;
	}
	const releases: Array<GithubRelease & { version: string }> = [];
	for (const release of parsed.data) {
		if (release.draft || (channel === "stable" && release.prerelease)) {
			continue;
		}
		const version = cleanSemver(release.tag_name);
		if (version && isVersionAllowedOnChannel(version, channel)) {
			releases.push({ ...release, version });
		}
	}
	return releases.sort((a, b) => compareReversed(a.version, b.version, { loose: true }));
}

export function parseGithubChangelog(payload: unknown, channel: UpdateChannel): { ok: true; items: ReleaseNoteEntry[] } | { ok: false; error: string } {
	const releases = channelReleases(payload, channel);
	if (!releases) {
		return { ok: false, error: t("main.update.changelogFailed") };
	}
	return {
		ok: true,
		items: releases.map((release) => ({
			version: release.version,
			name: release.name,
			body: release.body ? preprocessReleaseNotes(release.body) : release.body,
			publishedAt: release.published_at,
			prerelease: release.prerelease,
		})),
	};
}

/** Newest release on `channel` that is newer than `currentVersion`. */
export function pickUpdateRelease(payload: unknown, channel: UpdateChannel, currentVersion: string): GithubRelease | null {
	const latest = channelReleases(payload, channel)?.[0];
	return latest && isGreaterThanRange(latest.version, currentVersion, { includePrerelease: true, loose: true }) ? latest : null;
}
