import { cva, type VariantProps } from "class-variance-authority";
import { FlameIcon, StarIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { type AnimeAiringNoticeInput, type AnimeRankLine, animeAiringNotice } from "@/mainview/lib/anime-airing-notice";
import { cn } from "@/mainview/lib/utils";

const noticeSurface = cva("overflow-hidden", {
	variants: {
		surface: {
			default: "bg-muted/40",
			nowPlaying: "border-white/10 bg-black/55 text-zinc-50",
		},
	},
	defaultVariants: {
		surface: "default",
	},
});

const noticeDescription = cva("", {
	variants: {
		surface: {
			default: "",
			nowPlaying: "text-zinc-300",
		},
	},
	defaultVariants: {
		surface: "default",
	},
});

const rankValue = cva("", {
	variants: {
		kind: {
			rated: "text-amber-300",
			popular: "text-red-400/80",
		},
	},
});

const rankWatermark = cva("pointer-events-none absolute top-2 -right-1", {
	variants: {
		kind: {
			rated: "text-amber-300/20",
			popular: "text-red-400/20",
		},
	},
});

type NoticeSurface = NonNullable<VariantProps<typeof noticeSurface>["surface"]>;

function AnimeRankNotice({ kind, rank, surface }: AnimeRankLine & { surface: NoticeSurface }) {
	const isRated = kind === "rated";
	const Icon = isRated ? StarIcon : FlameIcon;
	return (
		<Alert role='status' className={noticeSurface({ surface })}>
			<span aria-hidden className={rankWatermark({ kind })}>
				<Icon className='size-16 fill-current stroke-none' />
			</span>
			<AlertTitle>{isRated ? "Highest rated" : "Most popular"}</AlertTitle>
			<AlertDescription className={rankValue({ kind })}>#{rank}</AlertDescription>
		</Alert>
	);
}

export function AnimeStatusNotice({ anime, surface = "default" }: { anime: AnimeAiringNoticeInput; surface?: NoticeSurface }) {
	const notice = animeAiringNotice(anime);
	if (!notice) {
		return null;
	}
	return (
		<div className='flex flex-col gap-2'>
			{notice.title ? (
				<Alert role='status' className={noticeSurface({ surface })}>
					<AlertTitle>{notice.title}</AlertTitle>
					{notice.description ? <AlertDescription className={cn(noticeDescription({ surface }))}>{notice.description}</AlertDescription> : null}
				</Alert>
			) : null}
			{notice.ranks.map((line) => (
				<AnimeRankNotice key={line.kind} {...line} surface={surface} />
			))}
		</div>
	);
}
