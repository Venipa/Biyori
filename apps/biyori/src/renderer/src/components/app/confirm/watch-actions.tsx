import { useTranslation } from "@biyori/translations/react";
import { Button } from "@/mainview/components/ui/button";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { trpc } from "@/mainview/trpc";

export function WatchConfirmActions({ disabled, size = "sm", onSkip, onUpdate }: { disabled?: boolean; size?: "xs" | "sm"; onSkip: () => void; onUpdate: () => void }) {
	const { t } = useTranslation();
	return (
		<div className='flex shrink-0 items-center gap-1 [&_button]:cursor-pointer'>
			<Button type='button' variant='outline' size={size} onClick={onSkip}>
				{t("confirm.skip")}
			</Button>
			<Button type='button' size={size} disabled={disabled} onClick={onUpdate}>
				{t("confirm.update")}
			</Button>
		</div>
	);
}

export function useWatchConfirm() {
	const utils = trpc.useUtils();
	const query = trpc.media.nowPlaying.useQuery();
	const confirm = trpc.media.confirmUpdate.useMutation({
		onSuccess: () => {
			void invalidateAnimeQueries(utils, "watched");
		},
	});
	const skip = trpc.media.skipUpdate.useMutation();
	const pending = query.data?.pendingConfirm ?? null;
	return { pending, confirm, skip };
}
