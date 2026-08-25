import type { AppSettings, AppSettingsPatch } from "./schemas/app-settings";

function sameJson(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

export function pickDirtySettings(values: AppSettings, dirty: object, defaults: object): AppSettingsPatch {
	const patch: Record<string, unknown> = {};
	const dirtyRecord = dirty as Record<string, unknown>;
	const defaultsRecord = defaults as Record<string, unknown>;
	for (const key of Object.keys(values) as Array<keyof AppSettings>) {
		const flag = dirtyRecord[key as string];
		const current = values[key];
		if (flag) {
			patch[key as string] = current;
			continue;
		}
		if (Array.isArray(current) && !sameJson(current, defaultsRecord[key as string])) {
			patch[key as string] = current;
		}
	}
	return patch;
}
