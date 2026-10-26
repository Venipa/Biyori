import { useTranslation } from "@biyori/translations/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/mainview/trpc";

export function ParentWindowScrim() {
	const { t } = useTranslation();
	const [dimmed, setDimmed] = useState(false);
	const focusChild = trpc.desktop.focusModalChild.useMutation();
	trpc.desktop.onParentDimmed.useSubscription(undefined, {
		onData: (open) => {
			setDimmed(open === true);
		},
	});
	if (!dimmed) {
		return null;
	}
	return createPortal(
		<button
			type='button'
			aria-label={t("shell.returnToSettings")}
			className='fixed inset-0 isolate z-[100] bg-background/50 backdrop-blur-sm'
			onClick={() => {
				focusChild.mutate();
			}}
		/>,
		document.body,
	);
}
