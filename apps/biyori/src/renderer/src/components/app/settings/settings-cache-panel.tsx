import { t, useTranslation } from "@biyori/translations/react";
import { useId, useState } from "react";
import type { CacheKind } from "@/lib/schemas/cache-kind";
import { ConfirmDialog } from "@/mainview/components/app/confirm/dialog";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/mainview/components/ui/field";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";

const CACHE_OPTIONS: { kind: CacheKind; hasSize: boolean }[] = [
	{ kind: "history", hasSize: false },
	{ kind: "images", hasSize: true },
	{ kind: "torrents", hasSize: true },
	{ kind: "torrentHistory", hasSize: false },
];

function cacheLabel(kind: CacheKind): string {
	switch (kind) {
		case "history":
			return t("settings.cache.history");
		case "images":
			return t("settings.cache.images");
		case "torrents":
			return t("settings.cache.torrents");
		case "torrentHistory":
			return t("settings.cache.torrentHistory");
	}
}

function formatBytes(bytes: number): string {
	const units = ["B", "KiB", "MiB", "GiB", "TiB"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function SettingsCachePanel() {
	const { t } = useTranslation();
	const ids = {
		history: useId(),
		images: useId(),
		torrents: useId(),
		torrentHistory: useId(),
	};
	const [selected, setSelected] = useState<Set<CacheKind>>(() => new Set());
	const [confirmOpen, setConfirmOpen] = useState(false);
	const utils = trpc.useUtils();
	const summary = trpc.settings.cacheSummary.useQuery();
	const clearCache = trpc.settings.clearCache.useMutation({
		onSuccess: async () => {
			setSelected(new Set());
			setConfirmOpen(false);
			await Promise.all([
				utils.settings.cacheSummary.invalidate(),
				utils.history.list.invalidate(),
				utils.statistics.summary.invalidate(),
				utils.covers.get.invalidate(),
				utils.torrents.list.invalidate(),
			]);
		},
	});

	const selectedKinds = CACHE_OPTIONS.filter((option) => selected.has(option.kind) && (summary.data?.[option.kind].count ?? 0) > 0);

	return (
		<SettingsSectionCard title={t("settings.cache.title")} description={t("settings.cache.description")}>
			{summary.data ? (
				<FieldSet>
					<FieldLegend className='sr-only'>{t("settings.cache.legend")}</FieldLegend>
					{CACHE_OPTIONS.map((option) => {
						const bucket = summary.data[option.kind];
						const empty = bucket.count === 0;
						const checked = selected.has(option.kind);
						const sizeLabel = option.hasSize && bucket.sizeBytes != null ? ` (${formatBytes(bucket.sizeBytes)})` : "";
						return (
							<Field
								key={option.kind}
								orientation='horizontal'
								data-disabled={empty || undefined}
								className={cn("rounded-md border px-2 py-1.5", checked ? "border-primary bg-accent" : "border-border")}>
								<Checkbox
									id={ids[option.kind]}
									disabled={empty}
									checked={checked}
									onCheckedChange={(value) => {
										setSelected((prev) => {
											const next = new Set(prev);
											if (value === true) {
												next.add(option.kind);
											} else {
												next.delete(option.kind);
											}
											return next;
										});
									}}
								/>
								<FieldLabel htmlFor={ids[option.kind]} className='w-full justify-between font-normal'>
									<span>{cacheLabel(option.kind)}</span>
									<span className='text-muted-foreground'>
										{t("settings.cache.item", { count: bucket.count })}
										{sizeLabel}
									</span>
								</FieldLabel>
							</Field>
						);
					})}
				</FieldSet>
			) : (
				<Skeleton className='h-40 w-full' />
			)}
			{selectedKinds.length > 0 ? (
				<Button
					type='button'
					variant='destructive'
					loading={clearCache.isPending}
					onClick={() => {
						setConfirmOpen(true);
					}}>
					{t("settings.cache.clearSelected")}
				</Button>
			) : null}
			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title={t("settings.cache.clearTitle")}
				description={t("settings.cache.clearDescription", {
					items: selectedKinds.map((item) => cacheLabel(item.kind).toLowerCase()).join(", "),
				})}
				confirmLabel={t("settings.cache.clear")}
				pending={clearCache.isPending}
				onConfirm={() => {
					void clearCache.mutateAsync({ kinds: selectedKinds.map((item) => item.kind) });
				}}
			/>
		</SettingsSectionCard>
	);
}
