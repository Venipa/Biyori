import { addDays, format, isSameDay, isValid, parseISO, startOfDay } from "date-fns";

function toDate(value: string): Date | null {
	const iso = parseISO(value);
	if (isValid(iso)) {
		return iso;
	}
	const parsed = new Date(value);
	return isValid(parsed) ? parsed : null;
}

export function formatTimeAgo(value: string | null | undefined): string {
	if (!value) {
		return "-";
	}
	const date = toDate(value);
	if (!date) {
		return value;
	}
	return formatDistanceToNow(date, { addSuffix: true });
}

export function formatLocalDateTime(value: string | null | undefined): string {
	if (!value) {
		return "-";
	}
	const date = toDate(value);
	if (!date) {
		return value;
	}
	return format(date, "yyyy-MM-dd HH:mm");
}

export function formatWeekdayClock(value: string | null | undefined): string {
	if (!value) {
		return "-";
	}
	const date = toDate(value);
	if (!date) {
		return value;
	}
	return format(date, "EEEE HH:mm");
}

export function formatClock(value: string | null | undefined): string {
	if (!value) {
		return "-";
	}
	const date = toDate(value);
	if (!date) {
		return value;
	}
	return format(date, "HH:mm");
}

export function formatAiringDayLabel(airingAt: Date, now: Date): string {
	const day = startOfDay(airingAt);
	const today = startOfDay(now);
	if (isSameDay(day, today)) {
		return "Today";
	}
	if (isSameDay(day, addDays(today, 1))) {
		return "Tomorrow";
	}
	return format(day, "EEE d MMM");
}
