const LIST_INVALIDATE_MS = 1000;

export function shouldBumpListRevision(lastBumpAt: number, now: number): boolean {
	return lastBumpAt === 0 || now - lastBumpAt >= LIST_INVALIDATE_MS;
}
