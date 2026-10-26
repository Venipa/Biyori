import { useTranslation } from "@biyori/translations/react";
import type { inferRouterOutputs } from "@trpc/server";
import { AlertCircleIcon } from "lucide-react";
import { MarkdownBody } from "@/mainview/components/app/shared/markdown-body";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Badge } from "@/mainview/components/ui/badge";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import type { AppRouter } from "@/shared/app-router";
import { getVersionChannel } from "@/shared/updater";

type ChangelogData = inferRouterOutputs<AppRouter>["updater"]["changelog"];

export function formatReleaseDate(iso: string | null): string {
	if (!iso) {
		return "";
	}
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toISOString().slice(0, 10);
}

export function Changelog({
	changelog,
	isLoading,
	queryError,
	installedVersion,
}: {
	changelog: ChangelogData | undefined;
	isLoading: boolean;
	queryError: boolean;
	installedVersion?: string;
}) {
	const { t } = useTranslation();
	return (
		<div className='flex max-w-3xl flex-col gap-3'>
			<div>
				<h2 className='text-sm font-semibold'>{t("about.changelog")}</h2>
				<p className='text-sm text-muted-foreground'>{t("about.recentReleases")}</p>
			</div>
			{isLoading ? (
				<div className='divide-y rounded-xl ring-1 ring-foreground/10'>
					{["a", "b", "c"].map((row) => (
						<div key={row} className='grid grid-cols-[7rem_minmax(0,1fr)] gap-4 px-4 py-3'>
							<Skeleton className='h-3 w-20' />
							<div className='flex flex-col gap-2'>
								<Skeleton className='h-3 w-1/3' />
								<Skeleton className='h-3 w-full' />
								<Skeleton className='h-3 w-5/6' />
							</div>
						</div>
					))}
				</div>
			) : queryError || (changelog && !changelog.ok) ? (
				<Alert variant='destructive'>
					<AlertCircleIcon />
					<AlertTitle>{t("about.couldNotLoad")}</AlertTitle>
					<AlertDescription>{changelog && !changelog.ok ? changelog.error : t("about.tryAgain")}</AlertDescription>
				</Alert>
			) : changelog?.ok && (changelog.items?.length ?? 0) === 0 ? (
				<div className='rounded-xl px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10'>
					<p>{t("about.noReleases")}</p>
					<p>{t("about.switchChannel")}</p>
				</div>
			) : changelog?.ok && changelog.items ? (
				<div className='divide-y rounded-xl ring-1 ring-foreground/10'>
					{changelog.items.map((item, index) => {
						const kind = getVersionChannel(item.version);
						const published = formatReleaseDate(item.publishedAt);
						const installed = item.version === installedVersion;
						// items are newest first: keep the latest and anything newer than the installed build open
						const open = index === 0 || index < changelog.items.findIndex((entry) => entry.version === installedVersion);
						return (
							<details key={item.version} open={open} className='px-4 py-3'>
								<summary className='flex cursor-pointer list-none items-center gap-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50'>
									<div className='flex w-28 shrink-0 flex-col self-start text-sm text-muted-foreground'>
										<time dateTime={item.publishedAt ?? undefined}>{published || "-"}</time>
										{kind === "beta" || kind === "alpha" ? <span className='text-xs'>{t(kind === "beta" ? "update.beta" : "update.alpha")}</span> : null}
									</div>
									<div className='flex min-w-0 flex-wrap items-center gap-2'>
										<h3 className='text-sm font-medium'>{item.name || `v${item.version}`}</h3>
										{installed ? <Badge variant='secondary'>{t("about.installed")}</Badge> : null}
									</div>
								</summary>
								<div className='mt-2 min-w-0 pl-32'>
									{item.body?.trim() ? <MarkdownBody markdown={item.body} /> : <p className='text-sm text-muted-foreground'>{t("about.noNotes")}</p>}
								</div>
							</details>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
