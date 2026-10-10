import { useTranslation } from "@biyori/translations/react";
import { useEffect, useRef, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/mainview/components/ui/alert-dialog";

let windowCloseGuard: (() => void) | null = null;

export function requestWindowClose(fallback: () => void): void {
	if (windowCloseGuard) {
		windowCloseGuard();
		return;
	}
	fallback();
}

function popupOwnsEscape(): boolean {
	return Boolean(
		document.querySelector(
			"[data-slot='select-content'][data-open], [data-slot='combobox-content'][data-open], [data-slot='dropdown-menu-content'][data-open], [data-slot='context-menu-content'][data-open]",
		),
	);
}

export function ConfirmEscape({
	blocked,
	onConfirm,
	title,
	description,
	confirmLabel,
	cancelLabel,
}: {
	blocked: boolean;
	onConfirm: () => void;
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
}) {
	const { t } = useTranslation();
	const confirmText = confirmLabel ?? t("common.discard");
	const cancelText = cancelLabel ?? t("shell.keepEditing");
	const [open, setOpen] = useState(false);
	const blockedRef = useRef(blocked);
	const openRef = useRef(open);
	const onConfirmRef = useRef(onConfirm);
	blockedRef.current = blocked;
	openRef.current = open;
	onConfirmRef.current = onConfirm;

	if (!blocked && open) {
		setOpen(false);
	}

	useEffect(() => {
		const dismiss = () => {
			if (!blockedRef.current || openRef.current) {
				onConfirmRef.current();
				return;
			}
			setOpen(true);
		};
		windowCloseGuard = dismiss;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented || event.repeat) {
				return;
			}
			if (popupOwnsEscape()) {
				return;
			}
			const otherAlert = document.querySelector("[data-slot='alert-dialog-content']");
			if (otherAlert && !openRef.current) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			dismiss();
		};
		window.addEventListener("keydown", onKeyDown, true);
		return () => {
			if (windowCloseGuard === dismiss) {
				windowCloseGuard = null;
			}
			window.removeEventListener("keydown", onKeyDown, true);
		};
	}, []);

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{cancelText}</AlertDialogCancel>
					<AlertDialogAction variant='destructive' onClick={() => onConfirmRef.current()}>
						{confirmText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
