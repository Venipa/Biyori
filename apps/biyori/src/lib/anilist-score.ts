import { z } from "zod";

export const anilistScoreFormatSchema = z.enum(["POINT_100", "POINT_10_DECIMAL", "POINT_10", "POINT_5"]);

export type AnilistScoreFormat = z.infer<typeof anilistScoreFormatSchema>;

export const DEFAULT_SCORE_FORMAT: AnilistScoreFormat = "POINT_100";

export type ScoreScale = {
	max: number;
	step: number;
};

export function parseScoreFormat(value: unknown): AnilistScoreFormat {
	const parsed = anilistScoreFormatSchema.safeParse(value);
	return parsed.success ? parsed.data : DEFAULT_SCORE_FORMAT;
}

export function scoreScale(format: AnilistScoreFormat): ScoreScale {
	switch (format) {
		case "POINT_10_DECIMAL":
			return { max: 10, step: 0.1 };
		case "POINT_10":
			return { max: 10, step: 1 };
		case "POINT_5":
			return { max: 5, step: 1 };
		default:
			return { max: 100, step: 1 };
	}
}

export function rawToDisplay(raw: number | null | undefined, format: AnilistScoreFormat): number {
	if (raw == null || raw <= 0) {
		return 0;
	}
	const clamped = Math.min(100, raw);
	switch (format) {
		case "POINT_10_DECIMAL":
			return Math.round(clamped) / 10;
		case "POINT_10":
			return Math.round(clamped / 10);
		case "POINT_5":
			return Math.round(clamped / 20);
		default:
			return Math.round(clamped);
	}
}

export function displayToRaw(display: number, format: AnilistScoreFormat): number | null {
	if (!Number.isFinite(display) || display <= 0) {
		return null;
	}
	const { max, step } = scoreScale(format);
	const snapped = Math.min(max, Math.max(0, Math.round(display / step) * step));
	if (snapped <= 0) {
		return null;
	}
	switch (format) {
		case "POINT_10_DECIMAL":
		case "POINT_10":
			return Math.min(100, Math.round(snapped * 10));
		case "POINT_5":
			return Math.min(100, Math.round(snapped * 20));
		default:
			return Math.min(100, Math.round(snapped));
	}
}

export function formatScore(raw: number | null | undefined, format: AnilistScoreFormat): string {
	const display = rawToDisplay(raw, format);
	if (display <= 0) {
		return "-";
	}
	if (format === "POINT_5") {
		return `${display}/5`;
	}
	if (format === "POINT_10_DECIMAL") {
		return Number.isInteger(display) ? String(display) : display.toFixed(1);
	}
	return String(display);
}
