import { useState } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/mainview/trpc";

function isAuxiliaryWindow(): boolean {
	const to = new URLSearchParams(window.location.search).get("to") ?? "";
	const hash = window.location.hash.replace(/^#/, "");
	const start = window.__BIYORI_START__ ?? "";
	const path = to || hash || start;
	return path.includes("/settings") || path.includes("/update");
}

export function ParentWindowScrim() {
	const auxiliary = isAuxiliaryWindow();
	const [dimmed, setDimmed] = useState(false);
	const focusChild = trpc.desktop.focusModalChild.useMutation();
	trpc.desktop.onParentDimmed.useSubscription(undefined, {
		enabled: !auxiliary,
		onData: setDimmed,
	});
	if (auxiliary || !dimmed) {
		return null;
	}
	return createPortal(
		<button
			type='button'
			aria-label='Return to the open dialog'
			className='fixed inset-0 isolate z-[100] bg-background/50 backdrop-blur-sm'
			onClick={() => {
				focusChild.mutate();
			}}
		/>,
		document.body,
	);
}
