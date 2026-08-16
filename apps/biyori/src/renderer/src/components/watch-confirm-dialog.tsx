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
import { trpc } from "@/mainview/trpc";

export function WatchConfirmDialog() {
	const utils = trpc.useUtils();
	const query = trpc.media.nowPlaying.useQuery();
	const confirm = trpc.media.confirmUpdate.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.anime.list.invalidate(),
				utils.anime.counts.invalidate(),
				utils.history.list.invalidate(),
				utils.history.queuedCount.invalidate(),
			]);
		},
	});
	const skip = trpc.media.skipUpdate.useMutation();
	const pending = query.data?.pendingConfirm ?? null;

	return (
		<AlertDialog
			open={Boolean(pending)}
			onOpenChange={(open) => {
				if (!open && pending) {
					void skip.mutateAsync();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Update list?</AlertDialogTitle>
					<AlertDialogDescription>
						Update {pending?.title ?? "this anime"} to episode {pending?.episode}?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						onClick={() => {
							void skip.mutateAsync();
						}}
					>
						Skip
					</AlertDialogCancel>
					<AlertDialogAction
						disabled={confirm.isPending}
						onClick={(event) => {
							event.preventDefault();
							void confirm.mutateAsync();
						}}
					>
						Update
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
