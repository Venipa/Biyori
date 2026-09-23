export type FollowDelta = {
	dx: number;
	dy: number;
};

export function ownerFollowDelta(input: { childDx: number; childDy: number; parentDx: number; parentDy: number; resized: boolean; parentFixed: boolean }): FollowDelta | null {
	if (input.parentFixed || input.resized) {
		return null;
	}
	if (input.childDx === input.parentDx && input.childDy === input.parentDy) {
		return null;
	}
	if (input.childDx === 0 && input.childDy === 0) {
		return null;
	}
	return { dx: input.childDx, dy: input.childDy };
}
