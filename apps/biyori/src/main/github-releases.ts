import { z } from "zod";

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

export function channelWantsPrerelease(channel: string): boolean {
	return channel !== "stable" && channel !== "dev";
}

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

export function parseGithubChangelog(payload: unknown, channel: string): { ok: true; items: GithubRelease[] } | { ok: false; error: string } {
	const parsed = z.array(githubReleaseSchema).safeParse(payload);
	if (!parsed.success) {
		return { ok: false, error: "Could not load changelog" };
	}
	const wantPre = channelWantsPrerelease(channel);
	const items = parsed.data
		.filter((release) => !release.draft && release.prerelease === wantPre)
		.map((release) => ({
			...release,
			body: release.body ? preprocessReleaseNotes(release.body) : release.body,
		}));
	return { ok: true, items };
}
