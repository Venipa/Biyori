import { useRef, useState } from "react";

export function useHeldOpenPayload<T>(active: T | undefined): {
	payload: T | undefined;
	onOpenChangeComplete: (open: boolean) => void;
} {
	const activeRef = useRef(active);
	activeRef.current = active;
	const [held, setHeld] = useState(active);

	if (active !== undefined && active !== held) {
		setHeld(active);
	}

	return {
		payload: held,
		onOpenChangeComplete: (open: boolean) => {
			if (!open && activeRef.current === undefined) {
				setHeld(undefined);
			}
		},
	};
}
