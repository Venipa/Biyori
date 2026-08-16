import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

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
