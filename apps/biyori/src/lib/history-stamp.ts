/** History stamps are UTC written as "YYYY-MM-DD HH:mm" (see main/track/queue.ts). Returns epoch ms or NaN. */
export function parseHistoryStamp(stamp: string): number {
	return Date.parse(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(stamp) ? `${stamp.replace(" ", "T")}:00Z` : stamp);
}
