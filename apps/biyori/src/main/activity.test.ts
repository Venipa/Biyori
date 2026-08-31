import { afterEach, describe, expect, test } from "bun:test";
import {
	ACTIVITY_MAX_AGE_MS,
	completeActivity,
	filterFreshActivities,
	getActivitySnapshot,
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

	test("complete persists one row and clears live", () => {
		upsertActivity({ source: "library-scan", title: "Scanning..." });
		completeActivity({ source: "library-scan", title: "Library scan", body: "3 files, 2 matched", status: "ok" });
		const next = getActivitySnapshot();
		expect(next.live).toEqual([]);
		expect(next.items).toHaveLength(1);
		expect(next.items[0]?.kind).toBe("activity");
		expect(next.items[0]?.status).toBe("ok");
		expect(next.items[0]?.title).toBe("Library scan");
		expect(next.items[0]?.body).toBe("3 files, 2 matched");
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
