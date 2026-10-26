import { beforeEach, describe, expect, test } from "bun:test";
import { beginStep, endStep, failActiveSteps, resetStartupSteps, startupSnapshot, subscribeStartup, updateStep } from "./startup-status";

describe("startup status", () => {
	beforeEach(() => resetStartupSteps());

	test("keeps steps in start order and tracks progress", () => {
		beginStep("services", "Services");
		updateStep("services", { detail: "DatabaseService", progress: 0.5 });
		beginStep("window", "Window");
		expect(startupSnapshot().map((step) => step.id)).toEqual(["services", "window"]);
		expect(startupSnapshot()[0]).toMatchObject({ state: "active", detail: "DatabaseService", progress: 0.5 });
		endStep("services");
		expect(startupSnapshot()[0]).toMatchObject({ state: "done", detail: undefined, progress: undefined });
	});

	test("fails only active steps and notifies listeners", () => {
		const seen: number[] = [];
		const off = subscribeStartup((steps) => seen.push(steps.length));
		beginStep("services", "Services");
		endStep("services");
		beginStep("window", "Window");
		failActiveSteps("boom");
		off();
		expect(startupSnapshot().map((step) => step.state)).toEqual(["done", "error"]);
		expect(startupSnapshot()[1]?.detail).toBe("boom");
		expect(seen.length).toBe(4);
	});

	test("ignores updates for unknown steps", () => {
		updateStep("nope", { progress: 1 });
		endStep("nope");
		expect(startupSnapshot()).toEqual([]);
	});
});
