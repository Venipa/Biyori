import { describe, expect, test } from "bun:test";
import { parseAppSettings, settingsFormDefaultValues, settingsFormSchema } from "./schemas/app-settings";
import { pickDirtySettings } from "./settings-dirty";

describe("pickDirtySettings", () => {
	test("includes libraryFolders when length changes but dirtyFields omitted the key", () => {
		const defaults = settingsFormSchema.parse({
			...settingsFormDefaultValues,
			...parseAppSettings({
				libraryFolders: [{ path: "D:\\Anime" }],
			}),
		});
		const values = { ...defaults, libraryFolders: [] };
		expect(pickDirtySettings(values, {}, defaults)).toEqual({
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
		expect(pickDirtySettings(defaults, {}, defaults)).toEqual({});
	});
});
