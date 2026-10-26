import { useTranslation } from "@biyori/translations/react";
import { useNavigate } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { formatNowPlayingLine, type NowPlayingSnapshot } from "@/mainview/components/app/now-playing/utils";
import { Button } from "@/mainview/components/ui/button";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { trpc } from "@/mainview/trpc";

export function UnrecognizedPlayback({ snapshot }: { snapshot: NowPlayingSnapshot }) {
	const navigate = useNavigate();
	const animeInfo = useAnimeInfoNav();
	const utils = trpc.useUtils();
	const chooseMatch = trpc.media.chooseMatch.useMutation({
		onSuccess: () => {
			void utils.media.nowPlaying.invalidate();
			void utils.anime.list.invalidate();
			void utils.anime.listed.invalidate();
		},
	});
	const { t } = useTranslation();
	const title = snapshot.parsed?.title ?? snapshot.media?.title ?? t("nowPlaying.unknownTitle");
	const episode = snapshot.parsed?.episode;
	const group = snapshot.parsed?.group;
	const searchQuery = title.trim();
	const similar = snapshot.similar ?? [];

	const filePath = snapshot.media?.filePath ?? snapshot.parsed?.filePath;

	return (
		<>
			<header className='flex flex-col gap-1'>
				<h1 className='text-balance text-lg font-semibold tracking-tight'>{title}</h1>
				<p className='text-sm text-muted-foreground'>{[t("nowPlaying.notRecognized"), formatNowPlayingLine(episode, group), snapshot.media?.player].filter(Boolean).join(" · ")}</p>
				{filePath ? <p className='break-all font-mono text-xs text-muted-foreground'>{filePath}</p> : null}
				<p className='mt-2 text-sm text-muted-foreground'>{similar.length > 0 ? t("nowPlaying.chooseOrSearch") : t("nowPlaying.searchList")}</p>
				{searchQuery ? (
					<Button
						type='button'
						size='sm'
						variant='outline'
						className='mt-2 self-start'
						onClick={() => {
							void navigate({ to: "/app/search", search: { q: searchQuery } });
						}}>
						<SearchIcon data-icon='inline-start' />
						{t("common.search")}
					</Button>
				) : null}
			</header>

			{similar.length > 0 ? (
				<section className='flex flex-col gap-2'>
					<h2 className='sticky top-0 z-10 -mx-1 border-b bg-background/95 px-1 py-2 text-sm font-medium backdrop-blur-sm'>{t("nowPlaying.similarTitles")}</h2>
					<ul className='flex flex-col'>
						{similar.map((item) => (
							<SimilarTitleRow
								key={item.id}
								item={item}
								disabled={chooseMatch.isPending}
								onChoose={() => {
									void chooseMatch.mutateAsync({ animeId: item.id });
								}}
								onInfo={() => {
									animeInfo.open({ id: item.id, infoTab: "list" });
								}}
							/>
						))}
					</ul>
				</section>
			) : null}
		</>
	);
}

/** Row click only opens info; linking needs the explicit button so a stray click cannot mislink. */
function SimilarTitleRow({
	item,
	disabled,
	onChoose,
	onInfo,
}: {
	item: NonNullable<NowPlayingSnapshot["similar"]>[number];
	disabled: boolean;
	onChoose: () => void;
	onInfo: () => void;
}) {
	const { t } = useTranslation();
	return (
		<li className='flex items-center gap-1'>
			<button type='button' onClick={onInfo} className='flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted'>
				<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' lazy className='aspect-2/3 w-7 shrink-0 overflow-hidden rounded-sm bg-muted' />
				<span className='min-w-0 flex-1 truncate'>{item.title}</span>
				{item.type ? <span className='shrink-0 text-xs text-muted-foreground'>{item.type}</span> : null}
			</button>
			<Button type='button' variant='outline' size='sm' aria-label={t("nowPlaying.linkTitle", { title: item.title })} disabled={disabled} onClick={onChoose}>
				{t("nowPlaying.link")}
			</Button>
		</li>
	);
}
