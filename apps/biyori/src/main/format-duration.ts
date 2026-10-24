export function formatElapsedSeconds(ms: number): string {
	if (ms < 1000) {
		return (Math.max(0, ms) / 1000).toFixed(1);
	}
	return String(Math.round(ms / 1000));
}
