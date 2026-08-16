/** Parse a JSON string array column; invalid / non-array -> []. */
export function parseJsonArray(value: string): string[] {
	try {
		const parsed: unknown = JSON.parse(value);
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed.filter((item): item is string => typeof item === "string");
	} catch {
		return [];
	}
}
