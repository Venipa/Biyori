import { useTranslation } from "@biyori/translations/react";
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

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	cancelLabel,
	onConfirm,
	pending = false,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	pending?: boolean;
}) {
	const { t } = useTranslation();
	const confirmText = confirmLabel ?? t("confirm.confirm");
	const cancelText = cancelLabel ?? t("common.cancel");
	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (pending && !next) {
					return;
				}
				onOpenChange(next);
			}}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>{cancelText}</AlertDialogCancel>
					<AlertDialogAction variant='destructive' loading={pending} onClick={onConfirm}>
						{confirmText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
