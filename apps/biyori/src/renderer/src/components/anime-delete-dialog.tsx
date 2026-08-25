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
import { useHeldOpenPayload } from "@/mainview/lib/held-open-payload";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { requestAnimeDelete, setSelectedAnime, useAnimeDeleteRequest } from "@/mainview/lib/selected-anime";
import { trpc } from "@/mainview/trpc";

export function AnimeDeleteDialog() {
	const pending = useAnimeDeleteRequest();
	const { payload: held, onOpenChangeComplete } = useHeldOpenPayload(pending ?? undefined);
	const utils = trpc.useUtils();
	const remove = trpc.anime.remove.useMutation();

	return (
		<AlertDialog
			open={Boolean(pending)}
			onOpenChange={(open) => {
				if (!open) {
					requestAnimeDelete(null);
				}
			}}
			onOpenChangeComplete={onOpenChangeComplete}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete from list</AlertDialogTitle>
					<AlertDialogDescription>Remove {held?.title ?? "this anime"} from your list?</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant='destructive'
						disabled={remove.isPending}
						onClick={() => {
							if (!held) {
								return;
							}
							void remove.mutateAsync({ id: held.id }).then(() => {
								requestAnimeDelete(null);
								setSelectedAnime(null);
								void invalidateAnimeQueries(utils, "removed");
							});
						}}>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
