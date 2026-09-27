import { useNavigate } from "@tanstack/react-router";
import { CircleAlertIcon, CircleHelpIcon, PlayCircleIcon, SearchIcon } from "lucide-react";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { formatNowPlayingLine, type NowPlayingSnapshot } from "@/mainview/components/app/now-playing/utils";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Card } from "@/mainview/components/ui/card";
import { Separator } from "@/mainview/components/ui/separator";
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
	const title = snapshot.parsed?.title ?? snapshot.media?.title ?? "Unknown title";
	const episode = snapshot.parsed?.episode;
	const group = snapshot.parsed?.group;
	const searchQuery = title.trim();
	const similar = snapshot.similar ?? [];

	return (
		<>
			<header className='flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-start'>
				<div className='flex size-28 shrink-0 items-center justify-center rounded-lg bg-muted ring-1 ring-border/60 sm:size-32'>
					<PlayCircleIcon className='size-10 text-muted-foreground' />
				</div>
				<div className='flex min-w-0 flex-1 flex-col gap-3'>
					<div className='flex flex-col gap-1.5'>
						<p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Now playing</p>
						<h1 className='text-balance text-xl font-semibold tracking-tight sm:text-2xl'>{title}</h1>
						<p className='text-sm text-muted-foreground'>{formatNowPlayingLine(episode, group)}</p>
					</div>
					<div className='flex flex-wrap items-center gap-1.5'>
						<Badge variant='destructive'>Not recognized</Badge>
						{snapshot.media ? <Badge variant='outline'>{snapshot.media.player}</Badge> : null}
					</div>
				</div>
			</header>

			<Alert variant='destructive'>
				<CircleAlertIcon />
				<AlertTitle>Unable to match this title</AlertTitle>
				<AlertDescription>
					{similar.length > 0
						? "Biyori could not identify this episode. Choose the correct anime from the list below, or search AniList."
						: "Biyori could not identify this episode against your list. Search AniList and add it, or check the filename."}
				</AlertDescription>
				{searchQuery ? (
					<AlertAction>
						<Button
							type='button'
							size='sm'
							variant='outline'
							onClick={() => {
								void navigate({
									to: "/app/search",
									search: { q: searchQuery },
								});
							}}>
							<SearchIcon data-icon='inline-start' />
							Search
						</Button>
					</AlertAction>
				) : null}
			</Alert>

			{similar.length > 0 ? (
				<section className='flex flex-col gap-2'>
					<h2 className='text-sm font-semibold'>Similar titles</h2>
					<Separator />
					<ul className='flex flex-col gap-2'>
						{similar.map((item) => (
							<li key={item.id}>
								<SimilarTitleCard
									item={item}
									disabled={chooseMatch.isPending}
									onChoose={() => {
										void chooseMatch.mutateAsync({ animeId: item.id });
									}}
									onInfo={() => {
										animeInfo.open({ id: item.id, infoTab: "list" });
									}}
								/>
							</li>
						))}
					</ul>
				</section>
			) : null}

			{snapshot.media?.filePath || snapshot.parsed?.filePath ? (
				<div>
					<h2 className='mb-1 text-sm font-semibold'>Source</h2>
					<Separator className='mb-2' />
					<p className='break-all font-mono text-xs text-muted-foreground'>{snapshot.media?.filePath ?? snapshot.parsed?.filePath}</p>
				</div>
			) : null}
		</>
	);
}

export function SimilarTitleCard({
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
	return (
		<Card size='sm' className='py-0'>
			<div className='flex items-stretch'>
				<Button
					type='button'
					variant='ghost'
					className='h-auto min-w-0 flex-1 items-center justify-start gap-3 rounded-xl px-2 py-2 text-left font-normal'
					disabled={disabled}
					onClick={onChoose}>
					<AnimeCover
						id={item.id}
						coverUrl={item.coverUrl || undefined}
						alt=''
						lazy
						width={40}
						height={60}
						className='aspect-2/3 w-10 shrink-0 overflow-hidden rounded-md bg-muted'
					/>
					<span className='flex min-w-0 flex-col gap-0.5'>
						<span className='truncate text-sm font-medium'>{item.title}</span>
						{item.type ? <span className='text-xs text-muted-foreground'>{item.type}</span> : null}
					</span>
				</Button>
				<Button type='button' variant='ghost' size='icon' className='m-1 shrink-0 self-center' aria-label={`Open ${item.title}`} disabled={disabled} onClick={onInfo}>
					<CircleHelpIcon />
				</Button>
			</div>
		</Card>
	);
}
