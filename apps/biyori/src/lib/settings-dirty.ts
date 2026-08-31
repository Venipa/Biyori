import type { SettingsFormPatch, SettingsFormValues } from "./schemas/app-settings";

function sameJson(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

export function pickDirtySettings(values: object, defaults: object): SettingsFormPatch {
	const patch: Record<string, unknown> = {};
	const current = values as Record<string, unknown>;
	const baseline = defaults as Record<string, unknown>;
	for (const key of Object.keys(current) as Array<keyof SettingsFormValues>) {
		if (!sameJson(current[key as string], baseline[key as string])) {
			patch[key as string] = current[key as string];
		}
	}
	return patch;
}

export function settingsFormIsDirty(values: object, defaults: object): boolean {
	return Object.keys(pickDirtySettings(values, defaults)).length > 0;
}
