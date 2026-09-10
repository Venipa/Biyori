import { describe, expect, test } from "bun:test";
import { profileInitials } from "./profile-initials";

describe("profileInitials", () => {
	test("uses two letters from a single name, or B when empty", () => {
		expect(profileInitials("")).toBe("B");
		expect(profileInitials("venipa")).toBe("VE");
		expect(profileInitials("Jane Doe")).toBe("JD");
	});
});
