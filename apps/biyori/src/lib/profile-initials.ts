export function profileInitials(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) {
		return "B";
	}
	const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
	}
	return trimmed.slice(0, 2).toUpperCase();
}
