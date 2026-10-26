import { t, useTranslation } from "@biyori/translations/react";
import { ExternalLinkIcon } from "lucide-react";
import { type AnilistScoreFormat, parseScoreFormat } from "@/lib/anilist-score";
import { profileInitials } from "@/lib/profile-initials";
import { AniListAccountCard, DefaultServiceField } from "@/mainview/components/app/onboarding/anilist-account-card";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { AccountAvatar, openAnilistProfile } from "@/mainview/components/app/shell/account-avatar";
import { Button } from "@/mainview/components/ui/button";
import { Card, CardContent } from "@/mainview/components/ui/card";
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
	const disconnect = trpc.anilist.disconnect.useMutation({
		onSuccess: async () => {
			await statusQuery.refetch();
		},
	});
	const connected = Boolean(statusQuery.data?.connected);
	const username = statusQuery.data?.username?.trim() ?? "";
	const avatarUrl = statusQuery.data?.avatarUrl?.trim() || null;
	const format = parseScoreFormat(statusQuery.data?.scoreFormat);

	if (!connected) {
		return <AniListAccountCard />;
	}

	return (
		<>
			<Card>
				<CardContent className='flex flex-wrap items-center gap-4'>
					<AccountAvatar initials={profileInitials(username)} avatarUrl={avatarUrl} className='size-12 shrink-0' />
					<div className='min-w-0 flex-1'>
						<p className='truncate font-medium'>{username || t("anime.anilist")}</p>
						<p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
							<span className='size-1.5 rounded-full bg-emerald-500' />
							{t("anime.anilist")} · {t("onboarding.connected")}
						</p>
					</div>
					<div className='flex gap-2'>
						{username ? (
							<Button
								type='button'
								variant='ghost'
								onClick={() => {
									openAnilistProfile(username);
								}}>
								<ExternalLinkIcon />
								{t("shell.viewOnAnilist")}
							</Button>
						) : null}
						<Button
							type='button'
							variant='outline'
							disabled={disconnect.isPending}
							onClick={() => {
								void disconnect.mutateAsync();
							}}>
							{t("onboarding.disconnect")}
						</Button>
					</div>
					{disconnect.error ? <p className='w-full text-sm text-destructive'>{disconnect.error.message}</p> : null}
				</CardContent>
			</Card>
			<SettingsSectionCard title={t("settings.services.displayTitle")} description={t("settings.services.displayDescription")}>
				<DefaultServiceField connected={connected} username={username} />
				<div className='flex items-center justify-between gap-3 text-sm'>
					<span className='font-medium'>{t("settings.services.scoreFormat")}</span>
					<span className='text-muted-foreground'>{scoreFormatLabel(format)}</span>
				</div>
			</SettingsSectionCard>
		</>
	);
}
