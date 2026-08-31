import { describe, expect, test } from "bun:test";
import { parseAppSettings, settingsFormDefaultValues, settingsFormSchema } from "./schemas/app-settings";
import { pickDirtySettings, settingsFormIsDirty } from "./settings-dirty";

describe("pickDirtySettings", () => {
	test("includes libraryFolders when length changes", () => {
		const defaults = settingsFormSchema.parse({
			...settingsFormDefaultValues,
			...parseAppSettings({
				libraryFolders: [{ path: "D:\\Anime" }],
			}),
		});
		const values = { ...defaults, libraryFolders: [] };
		expect(pickDirtySettings(values, defaults)).toEqual({
			libraryFolders: [],
		});
	});

	test("skips libraryFolders when the array matches defaults", () => {
		const defaults = settingsFormSchema.parse({
			...settingsFormDefaultValues,
			...parseAppSettings({
				libraryFolders: [{ path: "D:\\Anime" }],
			}),
		});
		expect(pickDirtySettings(defaults, defaults)).toEqual({});
	});

	test("includes a scalar when it changed even without dirtyFields", () => {
		const defaults = settingsFormSchema.parse(settingsFormDefaultValues);
		const values = { ...defaults, rssFeedUrl: "https://example.test/rss" };
		expect(pickDirtySettings(values, defaults)).toEqual({
			rssFeedUrl: "https://example.test/rss",
		});
		expect(settingsFormIsDirty(values, defaults)).toBe(true);
	});

	test("returns empty when objects are equal", () => {
		const defaults = settingsFormSchema.parse(settingsFormDefaultValues);
		expect(pickDirtySettings({ ...defaults }, defaults)).toEqual({});
		expect(settingsFormIsDirty(defaults, defaults)).toBe(false);
	});
});
