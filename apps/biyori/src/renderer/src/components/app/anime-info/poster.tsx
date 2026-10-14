import { useTranslation } from "@biyori/translations/react";
import { useState } from "react";
import { desktopRpc } from "@/desktop-rpc";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { Button } from "@/mainview/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/mainview/components/ui/context-menu";
import { Lightbox, LightboxContent, LightboxFooter, LightboxTitle } from "@/mainview/components/ui/lightbox";
import { trpc } from "@/mainview/trpc";

export function AnimeInfoPoster({ id, title, coverUrl }: { id: number; title: string; coverUrl: string }) {
	const { t } = useTranslation();
	const [lightbox, setLightbox] = useState(false);
	const savePoster = trpc.covers.save.useMutation();
	const copyPoster = trpc.covers.copy.useMutation();
	const hasPoster = coverUrl.trim().length > 0;
	const alt = t("nowPlaying.keyArt", { title });

	const saveAs = () => {
		if (!hasPoster) {
			return;
		}
		void savePoster.mutateAsync({
			animeId: id,
			kind: "cover",
			coverUrl,
			title,
		});
	};

	const copyImage = () => {
		if (!hasPoster) {
			return;
		}
		void copyPoster.mutateAsync({
			animeId: id,
			kind: "cover",
			coverUrl,
		});
	};

	const copyUrl = () => {
		if (!hasPoster) {
			return;
		}
		void navigator.clipboard.writeText(coverUrl);
	};

	const openUrl = () => {
		if (!hasPoster) {
			return;
		}
		void desktopRpc.request.openExternal({ url: coverUrl });
	};

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger
					disabled={!hasPoster}
					render={
						<button
							type='button'
							className='aspect-2/3 w-full cursor-zoom-in overflow-hidden rounded-md border bg-muted shadow-md ring-1 ring-foreground/10 disabled:cursor-default'
							aria-label={t("anime.viewPoster")}
							disabled={!hasPoster}
							onClick={() => {
								if (hasPoster) {
									setLightbox(true);
								}
							}}>
							<AnimeCover id={id} coverUrl={coverUrl || undefined} alt={alt} width={224} height={336} className='size-full' />
						</button>
					}
				/>
				<ContextMenuContent className='min-w-48'>
					<ContextMenuItem
						onClick={() => {
							setLightbox(true);
						}}>
						{t("anime.viewPoster")}
					</ContextMenuItem>
					<ContextMenuItem onClick={saveAs}>{t("anime.savePosterAs")}</ContextMenuItem>
					<ContextMenuItem onClick={copyImage}>{t("anime.copyPoster")}</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem onClick={copyUrl}>{t("anime.copyPosterUrl")}</ContextMenuItem>
					<ContextMenuItem onClick={openUrl}>{t("anime.openPosterUrl")}</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
			<Lightbox open={lightbox} onOpenChange={setLightbox}>
				<LightboxContent>
					<div className='aspect-2/3 max-h-[min(80vh,40rem)] w-[min(100%,24rem)] overflow-hidden'>
						<AnimeCover id={id} coverUrl={coverUrl || undefined} alt={alt} className='size-full' />
					</div>
					<LightboxFooter>
						<Button type='button' variant='ghost' className='text-white hover:bg-white/10 hover:text-white' loading={savePoster.isPending} onClick={saveAs}>
							{t("anime.savePosterAs")}
						</Button>
					</LightboxFooter>
				</LightboxContent>
			</Lightbox>
		</>
	);
}
