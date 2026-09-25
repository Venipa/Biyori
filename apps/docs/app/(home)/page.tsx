import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { BookOpenIcon, DownloadIcon, ScrollTextIcon, StarIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppShotBackdrop, AppShotCarousel } from "@/components/app-preview";
import { JsonLd } from "@/components/json-ld";
import { RevealBlock, RevealFrame, RevealList, Settle } from "@/components/landing-motion";
import { ReleaseDownloadPanel } from "@/components/release-download-panel";
import { bentoPlacementCss, loadBentoTiles } from "@/lib/bento";
import { cn } from "@/lib/cn";
import { getLatestReleasesByChannel, getLatestReleaseUrl, getRepositoryUrl, groupDownloadsByPlatform, pickPrimaryDownload } from "@/lib/github";
import { assetPath } from "@/lib/paths";
import { absolutePageUrl, homeJsonLd } from "@/lib/seo";
import { appDescription, appName, appTagline, changelogRoute, docsRoute, formatStarCount, repoStars } from "@/lib/shared";

const homeTitle = `${appName} - desktop anime list tracker`;

export const metadata: Metadata = {
	title: { absolute: homeTitle },
	description: appDescription,
	alternates: { canonical: absolutePageUrl("/") },
	openGraph: {
		url: absolutePageUrl("/"),
		title: homeTitle,
		description: appDescription,
	},
	twitter: {
		title: homeTitle,
		description: appDescription,
	},
};

const surfaces = [
	{
		title: "Watching",
		description: "The list you are on, as a table. Progress sits against the episode count, then the next air date, your score, the average, and the format.",
	},
	{
		title: "Now playing",
		description:
			"With no player, Home is the schedule: today, tomorrow, and later in the week, then titles still ahead. When playback matches, that view becomes the episode, with list status, progress, alternate titles, and the synopsis.",
	},
	{
		title: "Seasons",
		description: "One season at a time. Filter by airing status, sort by popularity, and plan a title or add it before the first episode.",
	},
	{
		title: "About",
		description: "The build you are running: app version, the Hana core, the update channel, and the changelog for that channel.",
	},
] as const;

const features = [
	{
		title: "AniList",
		description: "Connect your account and keep watching status in sync.",
		href: `${docsRoute}/anilist/`,
	},
	{
		title: "Library",
		description: "Scan folders and match local files to series.",
		href: `${docsRoute}/library/`,
	},
	{
		title: "Now playing",
		description: "Detect playback and confirm the episode match.",
		href: `${docsRoute}/now-playing/`,
	},
	{
		title: "Torrents",
		description: "RSS and search feeds for new episode releases.",
		href: `${docsRoute}/torrents/`,
	},
	{
		title: "Sharing",
		description: "Discord rich presence and a local now-playing HTTP endpoint.",
		href: `${docsRoute}/sharing/`,
	},
	{
		title: "Changelog",
		description: "Published GitHub releases and notes.",
		href: changelogRoute,
	},
] as const;

export default async function HomePage() {
	const releases = await getLatestReleasesByChannel();
	const release = releases.stable ?? releases.beta ?? releases.alpha;
	const groups = release ? groupDownloadsByPlatform(release.assets) : null;
	const anyAsset = (groups && (groups.windows[0] ?? groups.macos[0] ?? groups.linux[0])) || (release ? pickPrimaryDownload(release.assets) : undefined);
	const downloadUrl = anyAsset?.browser_download_url ?? getLatestReleaseUrl();
	const bento = loadBentoTiles();
	const featureByFile = new Map<string, (typeof features)[number]>();
	for (const tile of bento) {
		if (featureByFile.size >= features.length) continue;
		const feature = features[featureByFile.size];
		if (feature) featureByFile.set(tile.src, feature);
	}

	return (
		<main className='mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-12 md:gap-20 md:py-16'>
			<JsonLd data={homeJsonLd()} />
			<section className='relative overflow-hidden'>
				<AppShotBackdrop />

				<div className='relative z-10 grid items-start gap-10 py-2 lg:grid-cols-[1.15fr_0.85fr]'>
					<Settle className='flex flex-col items-start text-left'>
						<div className='mb-6 inline-flex items-center gap-3.5'>
							<Image src={assetPath("/logo.svg")} alt='' width={48} height={48} className='size-12 shrink-0 rounded-xl' unoptimized priority />
							<span className='text-2xl font-semibold tracking-tight md:text-3xl'>{appName}</span>
						</div>
						<h1 className='max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-5xl'>{appTagline}</h1>
						<p className='mt-4 max-w-xl text-base text-pretty text-fd-muted-foreground md:text-lg'>{appDescription}</p>
						<div className='mt-8 flex flex-col gap-3'>
							<div className='flex flex-wrap gap-3'>
								<Link href={docsRoute} className={cn(buttonVariants({ variant: "primary" }), "gap-2 px-4 py-2")}>
									<BookOpenIcon className='size-4' />
									Read the docs
								</Link>
								<a
									href={downloadUrl}
									className={cn(buttonVariants({ variant: "secondary" }), "gap-2 border border-fd-border bg-fd-secondary px-4 py-2 text-fd-secondary-foreground")}>
									<DownloadIcon className='size-4' />
									{release ? `Download ${release.tag_name}` : "Download latest"}
								</a>
							</div>
							<div className='flex flex-wrap gap-3'>
								{repoStars != null && (
									<a
										href={getRepositoryUrl()}
										target='_blank'
										rel='noreferrer'
										className={cn(buttonVariants({ variant: "secondary" }), "gap-2 border border-fd-border bg-fd-secondary px-4 py-2 text-fd-secondary-foreground")}
										aria-label={`${formatStarCount(repoStars)} stars on GitHub`}>
										<StarIcon className='size-4 fill-current' />
										<span className='tabular-nums'>{formatStarCount(repoStars)}</span>
									</a>
								)}
								<Link
									href={changelogRoute}
									className={cn(buttonVariants({ variant: "secondary" }), "gap-2 border border-fd-border bg-fd-secondary px-4 py-2 text-fd-secondary-foreground")}>
									<ScrollTextIcon className='size-4' />
									Changelog
								</Link>
							</div>
						</div>
					</Settle>

					<Settle from='x' delay={0.08}>
						<ReleaseDownloadPanel releases={releases} />
					</Settle>
				</div>
			</section>

			<RevealFrame>
				<AppShotCarousel />
			</RevealFrame>

			<section className='grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16'>
				<RevealBlock className='max-w-md'>
					<h2 className='text-2xl font-semibold tracking-tight text-balance md:text-3xl'>The list, the player, the season</h2>
					<p className='mt-3 text-pretty leading-relaxed text-fd-muted-foreground'>
						AniList is the list. The sidebar is the library you already keep: Watching, Done, Hold, Drop, and Plan, plus History and Statistics. Seasons and Torrents sit under
						Discover.
					</p>
				</RevealBlock>
				<RevealList as='dl' className='grid gap-8 sm:grid-cols-2'>
					{surfaces.map((item) => (
						<div key={item.title} className='max-w-prose'>
							<dt className='font-medium tracking-tight'>{item.title}</dt>
							<dd className='mt-1.5 text-sm leading-relaxed text-pretty text-fd-muted-foreground'>{item.description}</dd>
						</div>
					))}
				</RevealList>
			</section>

			<div className='[container-type:inline-size]'>
				<div className='mb-6 max-w-md'>
					<h2 className='text-2xl font-semibold tracking-tight text-balance md:text-3xl'>What it does</h2>
					<p className='mt-2 text-pretty text-fd-muted-foreground'>List tracking, local files, playback matching, and torrent feeds in one desktop app.</p>
				</div>
				<style href='bento-placement' precedence='bento-placement'>
					{bentoPlacementCss(bento)}
				</style>
				<RevealBlock className='grid grid-cols-2 gap-3 auto-rows-[calc((100cqi-2.25rem)/4)] sm:grid-cols-3 sm:auto-rows-[calc((100cqi-3.75rem)/6)] lg:grid-cols-4 lg:auto-rows-[calc((100cqi-5.25rem)/8)]'>
					{bento.map((tile) => {
						const feature = featureByFile.get(tile.src);
						const className = "group relative block overflow-hidden rounded-2xl";
						const wide = tile.ratio === "2:1";
						const media = (
							<>
								<span className='absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100'>
									<Image
										src={assetPath(tile.src)}
										alt=''
										fill
										sizes={wide ? "(min-width: 1024px) 560px, (min-width: 640px) 66vw, 100vw" : "(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"}
										className='object-cover'
										style={{ objectPosition: tile.objectPosition }}
									/>
									{tile.shot != null ? (
										<Image
											src={assetPath(tile.shot)}
											alt='Biyori now playing on a matched episode, with list progress and synopsis'
											fill
											sizes='(min-width: 1024px) 560px, (min-width: 640px) 66vw, 100vw'
											className='object-cover object-left [mask-image:linear-gradient(to_right,transparent,black_36%,black)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_36%,black)]'
										/>
									) : null}
								</span>
								<span className='pointer-events-none absolute inset-0 bg-black/30' aria-hidden='true' />
								{feature != null ? (
									<span className='pointer-events-none absolute inset-x-0 bottom-0 flex h-[72%] flex-col justify-end bg-[linear-gradient(to_top,rgb(0_0_0/0.92)_0%,rgb(0_0_0/0.72)_18%,rgb(0_0_0/0.38)_46%,rgb(0_0_0/0.12)_72%,transparent_100%)] px-4 pb-4'>
										<span className='block font-medium tracking-tight text-white'>{feature.title}</span>
										<span className='mt-1 block text-sm leading-snug text-pretty text-white/80'>{feature.description}</span>
									</span>
								) : null}
							</>
						);

						if (!feature) {
							return (
								<div key={tile.src} data-bento-cell={tile.src.slice(1)} className={className}>
									{media}
								</div>
							);
						}

						return (
							<Link key={tile.src} href={feature.href} data-bento-cell={tile.src.slice(1)} className={className}>
								{media}
							</Link>
						);
					})}
				</RevealBlock>
			</div>
		</main>
	);
}
