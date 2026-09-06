import { useEffect } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/mainview/components/ui/alert-dialog";
import { useWatchConfirm, WatchConfirmActions } from "@/mainview/components/watch-confirm-actions";
import { getActivityPanelState, promoteWatchConfirm, resetWatchConfirmPromoted, useActivityPanelState } from "@/mainview/lib/activity-panel";

const CONFIRM_DIALOG_MS = 10_000;

export function WatchConfirmDialog() {
	const { pending, confirm, skip } = useWatchConfirm();
	const { watchConfirmPromoted } = useActivityPanelState();
	const pendingKey = pending ? `${pending.animeId}:${pending.episode}` : "";

	useEffect(() => {
		if (!pendingKey) {
			resetWatchConfirmPromoted();
			return;
		}
		resetWatchConfirmPromoted();
		const timer = setTimeout(() => {
			promoteWatchConfirm();
		}, CONFIRM_DIALOG_MS);
		return () => {
			clearTimeout(timer);
		};
	}, [pendingKey]);

	const dialogOpen = Boolean(pending) && !watchConfirmPromoted;

	return (
		<AlertDialog
			open={dialogOpen}
			onOpenChange={(open) => {
				if (!open && pending && !getActivityPanelState().watchConfirmPromoted) {
					void skip.mutateAsync();
				}
			}}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Update list?</AlertDialogTitle>
					<AlertDialogDescription>
						Update {pending?.title ?? "this anime"} to episode {pending?.episode}?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<WatchConfirmActions
						disabled={confirm.isPending}
						onSkip={() => {
							void skip.mutateAsync();
						}}
						onUpdate={() => {
							void confirm.mutateAsync();
						}}
					/>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
