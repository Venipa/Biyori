import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { BookOpenIcon, ClapperboardIcon, DownloadIcon, FolderSearchIcon, ListIcon, RadioIcon, ScrollTextIcon, SearchIcon, StarIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ReleaseDownloadPanel } from "@/components/release-download-panel";
import { cn } from "@/lib/cn";
import { getLatestReleasesByChannel, getLatestReleaseUrl, getRepositoryUrl, groupDownloadsByPlatform, pickPrimaryDownload } from "@/lib/github";
import { assetPath } from "@/lib/paths";
import { appDescription, appName, appTagline, changelogRoute, docsRoute, formatStarCount, repoStars } from "@/lib/shared";

const features = [
	{
		title: "AniList",
		description: "Connect your account and keep watching status in sync.",
		href: `${docsRoute}/anilist/`,
		icon: ListIcon,
	},
	{
		title: "Library",
		description: "Scan folders and match local files to series.",
		href: `${docsRoute}/library/`,
		icon: FolderSearchIcon,
	},
	{
		title: "Now playing",
		description: "Detect playback and confirm the episode match.",
		href: `${docsRoute}/now-playing/`,
		icon: ClapperboardIcon,
	},
	{
		title: "Torrents",
		description: "RSS and search feeds for new episode releases.",
		href: `${docsRoute}/torrents/`,
		icon: SearchIcon,
	},
	{
		title: "Sharing",
		description: "Discord rich presence and a local now-playing HTTP endpoint.",
		href: `${docsRoute}/sharing/`,
		icon: RadioIcon,
	},
	{
		title: "Changelog",
		description: "Published GitHub releases and notes.",
		href: changelogRoute,
		icon: ScrollTextIcon,
	},
] as const;

export default async function HomePage() {
	const releases = await getLatestReleasesByChannel();
	const release = releases.stable ?? releases.beta ?? releases.alpha;
	const groups = release ? groupDownloadsByPlatform(release.assets) : null;
	const anyAsset = (groups && (groups.windows[0] ?? groups.macos[0] ?? groups.linux[0])) || (release ? pickPrimaryDownload(release.assets) : undefined);
	const downloadUrl = anyAsset?.browser_download_url ?? getLatestReleaseUrl();

	return (
		<main className='mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-12 md:gap-20 md:py-16'>
			<section className='relative overflow-hidden rounded-2xl border bg-fd-card'>
				<div className='relative z-10 grid items-start gap-10 px-6 py-12 md:px-12 md:py-16 lg:grid-cols-[1.15fr_0.85fr]'>
					<div className='flex flex-col items-start text-left'>
						<div className='mb-6 inline-flex items-center gap-3.5'>
							<Image src={assetPath("/logo.png")} alt='' width={48} height={48} className='size-12 shrink-0 rounded-xl' priority />
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
					</div>

					<ReleaseDownloadPanel releases={releases} />
				</div>
			</section>

			<section>
				<div className='mb-8 max-w-2xl'>
					<h2 className='text-2xl font-semibold tracking-tight md:text-3xl'>What it does</h2>
					<p className='mt-2 text-pretty text-fd-muted-foreground'>List tracking, local files, playback matching, and torrent feeds in one Electron app.</p>
				</div>
				<div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
					{features.map((item) => (
						<Link
							key={item.title}
							href={item.href}
							className='group flex h-full flex-col gap-2 rounded-2xl border bg-fd-card p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-fd-primary/40'>
							<item.icon className='size-5 text-fd-primary' />
							<h3 className='font-medium tracking-tight text-balance'>{item.title}</h3>
							<p className='text-sm leading-snug text-pretty text-fd-muted-foreground'>{item.description}</p>
						</Link>
					))}
				</div>
			</section>
		</main>
	);
}
