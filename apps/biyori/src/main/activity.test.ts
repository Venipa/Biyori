import { afterEach, describe, expect, test } from "bun:test";
import {
	ACTIVITY_MAX_AGE_MS,
	completeActivity,
	dismissActivity,
	filterFreshActivities,
	getActivitySnapshot,
	pushNotice,
	resetActivityCenterForTests,
	upsertActivity,
} from "./activity";

describe("activity center", () => {
	afterEach(() => {
		resetActivityCenterForTests();
	});

	test("upsert replaces the same source", () => {
		upsertActivity({ source: "library-scan", title: "Scanning..." });
		upsertActivity({ source: "library-scan", title: "Matching..." });
		expect(getActivitySnapshot().live).toEqual([{ source: "library-scan", title: "Matching...", body: "" }]);
	});

	test("upsert keeps title and body", () => {
		upsertActivity({ source: "list-update", title: "Update One Piece", body: "Update to episode 1125" });
		expect(getActivitySnapshot().live).toEqual([{ source: "list-update", title: "Update One Piece", body: "Update to episode 1125" }]);
	});

	test("ok completion clears live without persisting", () => {
		upsertActivity({ source: "library-scan", title: "Scanning..." });
		completeActivity({ source: "library-scan", title: "Library scan", body: "3 files, 2 matched", status: "ok" });
		expect(getActivitySnapshot()).toEqual({ live: [], items: [] });
	});

	test("error completion persists one row and clears live", () => {
		upsertActivity({ source: "library-scan", title: "Scanning..." });
		completeActivity({ source: "library-scan", title: "Library scan", body: "Failed", status: "error" });
		const next = getActivitySnapshot();
		expect(next.live).toEqual([]);
		expect(next.items).toHaveLength(1);
		expect(next.items[0]?.kind).toBe("activity");
		expect(next.items[0]?.status).toBe("error");
		expect(next.items[0]?.body).toBe("Failed");
	});

	test("dismiss removes one row or all", () => {
		pushNotice({ source: "torrent", title: "a" });
		pushNotice({ source: "torrent", title: "b" });
		const [first] = getActivitySnapshot().items;
		dismissActivity(first?.id);
		expect(getActivitySnapshot().items.map((row) => row.title)).toEqual(["a"]);
		dismissActivity();
		expect(getActivitySnapshot().items).toEqual([]);
	});

	test("drops rows older than 7 days", () => {
		const stale = {
			id: "old",
			kind: "notice" as const,
			source: "playback",
			title: "old",
			body: "",
			status: "ok" as const,
			createdAt: new Date(Date.now() - ACTIVITY_MAX_AGE_MS - 1).toISOString(),
		};
		const fresh = {
			...stale,
			id: "new",
			createdAt: new Date().toISOString(),
		};
		expect(filterFreshActivities([stale, fresh])).toEqual([fresh]);
	});
});
