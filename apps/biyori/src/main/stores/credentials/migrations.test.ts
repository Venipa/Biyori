import { describe, expect, test } from "bun:test";
import { credentialsStoreMigrations } from "./migrations";

function fakeConf(data: Record<string, unknown>) {
	return {
		get: (key: string) => data[key],
		set: (key: string, value: unknown) => {
			data[key] = value;
		},
		delete: (key: string) => {
			delete data[key];
		},
	};
}

describe("credentials migration v1", () => {
	test("moves legacy AniList id and token keys", () => {
		const data: Record<string, unknown> = { activeAccountId: 42, tokens: { "42": { accessToken: "a", expiresAt: 1 } } };
		// biome-ignore lint/suspicious/noExplicitAny: minimal conf stand-in
		credentialsStoreMigrations[0]?.hook(fakeConf(data) as any, 1);
		expect(data).toEqual({ activeAccount: { service: "anilist", id: 42 }, tokens: { "anilist:42": { accessToken: "a", expiresAt: 1 } } });
	});

	test("signed out stays signed out", () => {
		const data: Record<string, unknown> = { activeAccountId: null };
		// biome-ignore lint/suspicious/noExplicitAny: minimal conf stand-in
		credentialsStoreMigrations[0]?.hook(fakeConf(data) as any, 1);
		expect(data).toEqual({ tokens: {} });
	});
});
