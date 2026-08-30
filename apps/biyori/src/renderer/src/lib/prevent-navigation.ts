import { useBlocker } from "@tanstack/react-router";

export function usePreventNavigation(blocked: boolean): void {
	useBlocker({
		shouldBlockFn: () => true,
		disabled: !blocked,
		enableBeforeUnload: false,
	});
}
