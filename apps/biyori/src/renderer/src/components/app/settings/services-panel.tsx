import { t, useTranslation } from "@biyori/translations/react";
import { type AnilistScoreFormat, parseScoreFormat } from "@/lib/anilist-score";
import { AniListAccountCard } from "@/mainview/components/app/onboarding/anilist-account-card";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { trpc } from "@/mainview/trpc";

function scoreFormatLabel(format: AnilistScoreFormat): string {
	switch (format) {
		case "POINT_10_DECIMAL":
			return t("settings.services.scoreFormatPoint10Decimal");
		case "POINT_10":
			return t("settings.services.scoreFormatPoint10");
		case "POINT_5":
			return t("settings.services.scoreFormatPoint5");
		default:
			return t("settings.services.scoreFormatPoint100");
	}
}

export function ServicesPanel() {
	const { t } = useTranslation();
	const statusQuery = trpc.anilist.status.useQuery();
	const connected = Boolean(statusQuery.data?.connected);
	const format = parseScoreFormat(statusQuery.data?.scoreFormat);

	return (
		<>
			<AniListAccountCard />
			{connected ? (
				<SettingsSectionCard title={t("settings.services.displayTitle")} description={t("settings.services.displayDescription")}>
					<dl className='grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[8.5rem_1fr]'>
						<dt className='text-muted-foreground'>{t("settings.services.scoreFormat")}</dt>
						<dd>{scoreFormatLabel(format)}</dd>
					</dl>
				</SettingsSectionCard>
			) : null}
		</>
	);
}
