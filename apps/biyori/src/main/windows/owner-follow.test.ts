import { describe, expect, test } from "bun:test";
import { ownerFollowDelta } from "./owner-follow";

describe("ownerFollowDelta", () => {
	test("moves the owner when only the child moved", () => {
		expect(ownerFollowDelta({ childDx: 12, childDy: -4, parentDx: 0, parentDy: 0, resized: false, parentFixed: false })).toEqual({ dx: 12, dy: -4 });
	});

	test("ignores a child move that matches the owner move", () => {
		expect(ownerFollowDelta({ childDx: 8, childDy: 8, parentDx: 8, parentDy: 8, resized: false, parentFixed: false })).toBeNull();
	});

	test("ignores resize, a fixed owner, and no movement", () => {
		expect(ownerFollowDelta({ childDx: 5, childDy: 0, parentDx: 0, parentDy: 0, resized: true, parentFixed: false })).toBeNull();
		expect(ownerFollowDelta({ childDx: 5, childDy: 0, parentDx: 0, parentDy: 0, resized: false, parentFixed: true })).toBeNull();
		expect(ownerFollowDelta({ childDx: 0, childDy: 0, parentDx: 0, parentDy: 0, resized: false, parentFixed: false })).toBeNull();
	});
});
