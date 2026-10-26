import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { BookOpenIcon, DownloadIcon, ScrollTextIcon, StarIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HeroShot, Parallax, SurfaceWalkthrough } from "@/components/app-preview";
import { JsonLd } from "@/components/json-ld";
import { RevealBlock, Settle } from "@/components/landing-motion";
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

	const secondary = cn(buttonVariants({ variant: "ghost" }), "gap-2 px-4 py-2 text-fd-muted-foreground hover:text-fd-foreground");

	return (
		<main className='mx-auto flex w-full max-w-6xl flex-1 flex-col gap-28 px-4 pt-16 pb-24 md:gap-40 md:pt-24'>
			<JsonLd data={homeJsonLd()} />
			<section className='flex flex-col items-center text-center'>
				<Settle className='flex flex-col items-center'>
					<div className='mb-8 inline-flex items-center gap-3'>
						<Image src={assetPath("/logo.svg")} alt='' width={40} height={40} className='size-10 shrink-0 rounded-xl' unoptimized priority />
						<span className='text-xl font-semibold tracking-tight'>{appName}</span>
					</div>
					<h1 className='max-w-3xl text-5xl font-semibold tracking-[-0.035em] text-balance md:text-7xl'>{appTagline}</h1>
					<p className='mt-6 max-w-xl text-base text-pretty text-fd-muted-foreground md:text-lg'>{appDescription}</p>
				</Settle>
				<Settle delay={0.1} className='mt-10 flex flex-wrap items-center justify-center gap-2'>
					<a href={downloadUrl} className={cn(buttonVariants({ variant: "primary" }), "gap-2 px-5 py-2.5")}>
						<DownloadIcon className='size-4' />
						{release ? `Download ${release.tag_name}` : "Download latest"}
					</a>
					<Link href={docsRoute} className={secondary}>
						<BookOpenIcon className='size-4' />
						Read the docs
					</Link>
				</Settle>
				<div className='mt-16 w-full md:mt-20'>
					<HeroShot />
				</div>
			</section>

			<section>
				<RevealBlock className='mb-10 max-w-md lg:mb-0'>
					<h2 className='text-3xl font-semibold tracking-tight text-balance md:text-4xl'>The list, the player, the season</h2>
					<p className='mt-3 text-pretty leading-relaxed text-fd-muted-foreground'>
						AniList is the list. The sidebar is the library you already keep: Watching, Done, Hold, Drop, and Plan, plus History and Statistics.
					</p>
				</RevealBlock>
				<SurfaceWalkthrough />
			</section>

			<div className='[container-type:inline-size]'>
				<div className='mb-6 max-w-md'>
					<h2 className='text-3xl font-semibold tracking-tight text-balance md:text-4xl'>What it does</h2>
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
								<Parallax className='absolute inset-x-0 -inset-y-[8%] block'>
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
								</Parallax>
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

			<section className='grid items-start gap-10 border-t border-fd-border pt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16'>
				<RevealBlock className='max-w-md'>
					<h2 className='text-3xl font-semibold tracking-tight text-balance md:text-4xl'>Free, on every desktop</h2>
					<p className='mt-3 text-pretty leading-relaxed text-fd-muted-foreground'>Windows, macOS, and Linux builds for every release channel, straight from GitHub.</p>
					<div className='mt-6 flex flex-wrap gap-2'>
						{repoStars != null && (
							<a href={getRepositoryUrl()} target='_blank' rel='noreferrer' className={secondary} aria-label={`${formatStarCount(repoStars)} stars on GitHub`}>
								<StarIcon className='size-4 fill-current' />
								<span className='tabular-nums'>{formatStarCount(repoStars)}</span>
							</a>
						)}
						<Link href={changelogRoute} className={secondary}>
							<ScrollTextIcon className='size-4' />
							Changelog
						</Link>
					</div>
				</RevealBlock>
				<RevealBlock>
					<ReleaseDownloadPanel releases={releases} />
				</RevealBlock>
			</section>
		</main>
	);
}
