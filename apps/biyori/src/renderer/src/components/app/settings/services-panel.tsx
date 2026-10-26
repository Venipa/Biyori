import { t, useTranslation } from "@biyori/translations/react";
import { ExternalLinkIcon } from "lucide-react";
import { useId, useState } from "react";
import { type AnilistScoreFormat, parseScoreFormat } from "@/lib/anilist-score";
import { profileInitials } from "@/lib/profile-initials";
import { ConfirmDialog } from "@/mainview/components/app/confirm/dialog";
import { AniListAccountCard } from "@/mainview/components/app/onboarding/anilist-account-card";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { AccountAvatar, type AccountService, openServiceProfile, serviceLabel } from "@/mainview/components/app/shell/account-avatar";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Card, CardContent } from "@/mainview/components/ui/card";
import { Field, FieldLabel } from "@/mainview/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";
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
	const utils = trpc.useUtils();
	const [switchTarget, setSwitchTarget] = useState<AccountService | null>(null);
	const [waitingFor, setWaitingFor] = useState<AccountService | null>(null);
	// the login finishes in the browser; poll until the deep link lands (a switch relaunches the app)
	const statusQuery = trpc.account.status.useQuery(undefined, { refetchInterval: waitingFor ? 2000 : false });
	const anilistQuery = trpc.anilist.status.useQuery();
	const connectMal = trpc.account.connectMal.useMutation();
	const authorizeAnilist = trpc.anilist.authorize.useMutation();
	const disconnect = trpc.account.disconnect.useMutation({
		onSuccess: async () => {
			await Promise.all([utils.account.status.invalidate(), utils.anilist.status.invalidate()]);
		},
	});
	const status = statusQuery.data;
	const service = status?.service ?? "anilist";
	const username = status?.username?.trim() ?? "";
	const otherService: AccountService = service === "anilist" ? "myanimelist" : "anilist";
	const serviceId = useId();
	const format = service === "myanimelist" ? "POINT_10" : parseScoreFormat(anilistQuery.data?.scoreFormat);

	async function startLogin(target: AccountService): Promise<void> {
		setWaitingFor(target);
		if (target === "myanimelist") {
			await connectMal.mutateAsync();
		} else {
			await authorizeAnilist.mutateAsync();
		}
	}

	const loginNote = waitingFor ? <p className='text-sm text-muted-foreground'>{t("settings.services.waitingForLogin", { service: serviceLabel(waitingFor) })}</p> : null;
	const loginError = status?.loginError ? <p className='text-sm text-destructive'>{status.loginError}</p> : null;

	if (!status?.connected) {
		return (
			<>
				<AniListAccountCard />
				{status?.malAvailable ? (
					<Card>
						<CardContent className='flex flex-col items-start gap-3'>
							<Button
								type='button'
								variant='outline'
								disabled={connectMal.isPending}
								onClick={() => {
									void startLogin("myanimelist");
								}}>
								{t("settings.services.connectService", { service: serviceLabel("myanimelist") })}
								<Badge variant='outline' size='sm' className='ml-auto'>
									{t("onboarding.beta")}
								</Badge>
							</Button>
							{loginNote}
							{loginError}
						</CardContent>
					</Card>
				) : null}
			</>
		);
	}

	return (
		<>
			<Card>
				<CardContent className='flex flex-col gap-4'>
					<div className='flex flex-wrap items-center gap-4'>
						<AccountAvatar initials={profileInitials(username)} avatarUrl={status.avatarUrl?.trim() || null} className='size-12 shrink-0' />
						<div className='min-w-0 flex-1'>
							<p className='truncate font-medium'>{username || serviceLabel(service)}</p>
							<p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
								<span className='size-1.5 rounded-full bg-emerald-500' />
								{serviceLabel(service)} · {t("onboarding.connected")}
							</p>
						</div>
						<div className='flex flex-wrap gap-2'>
							{username ? (
								<Button
									type='button'
									variant='ghost'
									onClick={() => {
										openServiceProfile(service, username);
									}}>
									<ExternalLinkIcon />
									{t("settings.services.viewProfile", { service: serviceLabel(service) })}
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
					</div>
					<Field>
						<FieldLabel htmlFor={serviceId}>{t("settings.services.listService")}</FieldLabel>
						<Select
							value={service}
							items={{ anilist: serviceLabel("anilist"), myanimelist: serviceLabel("myanimelist"), kitsu: t("anime.kitsu") }}
							onValueChange={(next) => {
								if ((next === "anilist" || next === "myanimelist") && next !== service) {
									setSwitchTarget(next);
								}
							}}>
							<SelectTrigger id={serviceId} className='w-full sm:w-64' disabled={waitingFor != null}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent align='start'>
								<SelectGroup>
									<SelectItem value='anilist'>{serviceLabel("anilist")}</SelectItem>
									<SelectItem value='myanimelist' disabled={!status.malAvailable}>
										{serviceLabel("myanimelist")}
										<Badge variant='outline' size='sm' className='ml-auto'>
											{t("onboarding.beta")}
										</Badge>
									</SelectItem>
									<SelectItem value='kitsu' disabled>
										{t("anime.kitsu")}
										<Badge variant='secondary' size='sm' className='ml-auto'>
											{t("onboarding.soon")}
										</Badge>
									</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
					{loginNote}
					{loginError}
					{disconnect.error ? <p className='text-sm text-destructive'>{disconnect.error.message}</p> : null}
				</CardContent>
			</Card>
			<SettingsSectionCard title={t("settings.services.displayTitle")} description={t("settings.services.displayDescription")}>
				<div className='flex items-center justify-between gap-3 text-sm'>
					<span className='font-medium'>{t("settings.services.scoreFormat")}</span>
					<span className='text-muted-foreground'>{scoreFormatLabel(format)}</span>
				</div>
			</SettingsSectionCard>
			<ConfirmDialog
				open={switchTarget != null}
				onOpenChange={(open) => {
					if (!open) {
						setSwitchTarget(null);
					}
				}}
				title={t("settings.services.switchTitle", { service: serviceLabel(switchTarget ?? otherService) })}
				description={t("settings.services.switchDescription", { service: serviceLabel(switchTarget ?? otherService), current: serviceLabel(service) })}
				confirmLabel={t("settings.services.switchConfirm")}
				onConfirm={() => {
					const target = switchTarget;
					setSwitchTarget(null);
					if (target) {
						void startLogin(target);
					}
				}}
			/>
		</>
	);
}
