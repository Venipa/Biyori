import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import i18n from "i18next";
import { parse } from "yaml";

const en = parse(readFileSync(new URL("../locales/en.yaml", import.meta.url), "utf8"));

describe("en locale", () => {
	test("resolves copy and plurals", async () => {
		await i18n.init({
			lng: "en",
			fallbackLng: "en",
			initImmediate: false,
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
		expect(i18n.t("nowPlaying.continueWatching")).toBe("Continue watching");
		expect(i18n.t("nowPlaying.olderThan", { count: 1, days: 1 })).toBe("Older than 1 day");
		expect(i18n.t("nowPlaying.olderThan", { count: 30, days: 30 })).toBe("Older than 30 days");
		expect(i18n.t("nowPlaying.watchedLastWeek", { count: 2 })).toBe("You've watched 2 episodes last week.");
	});
});
