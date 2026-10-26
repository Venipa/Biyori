import { t, useTranslation } from "@biyori/translations/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { Controller, FormProvider, useForm, useFormContext, useFormState } from "react-hook-form";
import { profileInitials } from "@/lib/profile-initials";
import { type AnilistToken, type AnilistTokenInput, anilistTokenSchema } from "@/lib/schemas/anilist-token";
import type { AppSettingsInput, DefaultService } from "@/lib/schemas/app-settings";
import { AccountAvatar } from "@/mainview/components/app/shell/account-avatar";
import { Button } from "@/mainview/components/ui/button";
import { Card, CardContent } from "@/mainview/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";
import { Textarea } from "@/mainview/components/ui/textarea";
import { trpc } from "@/mainview/trpc";

function serviceLabels() {
	return {
		anilist: t("anime.anilist"),
		myanimelist: t("anime.myAnimeList"),
		kitsu: t("anime.kitsu"),
	} as const satisfies Record<DefaultService, string>;
}

function serviceValue(value: unknown): DefaultService {
	if (value === "anilist" || value === "myanimelist" || value === "kitsu") {
		return value;
	}
	return "anilist";
}

function ServiceOption({ label, detail }: { label: string; detail?: string }) {
	return (
		<span className='flex min-w-0 flex-col items-start whitespace-normal'>
			<span>{label}</span>
			{detail ? <span className='text-xs text-muted-foreground'>{detail}</span> : null}
		</span>
	);
}

export function DefaultServiceField({ connected, username }: { connected: boolean; username: string }) {
	const { t } = useTranslation();
	const serviceId = useId();
	const settingsForm = useFormContext<AppSettingsInput>();
	const labels = serviceLabels();
	return (
		<Controller
			control={settingsForm.control}
			name='defaultService'
			render={({ field, fieldState }) => (
				<Field data-invalid={fieldState.invalid || undefined}>
					<FieldLabel htmlFor={serviceId}>{t("onboarding.defaultService")}</FieldLabel>
					<Select
						value={serviceValue(field.value)}
						items={labels}
						onValueChange={(next) => {
							if (next === "anilist" || next === "myanimelist" || next === "kitsu") {
								field.onChange(next);
							}
						}}>
						<SelectTrigger
							id={serviceId}
							className='w-full whitespace-normal data-[size=default]:h-auto data-[size=default]:min-h-8 data-[size=default]:py-1.5 *:data-[slot=select-value]:items-start *:data-[slot=select-value]:line-clamp-none'
							aria-invalid={fieldState.invalid}>
							<SelectValue>
								{(value: unknown) => {
									const service = serviceValue(value);
									const detail = service === "anilist" && connected && username ? username : undefined;
									return <ServiceOption label={labels[service]} detail={detail} />;
								}}
							</SelectValue>
						</SelectTrigger>
						<SelectContent align='start'>
							<SelectGroup>
								<SelectItem value='anilist'>
									<ServiceOption label={t("anime.anilist")} detail={connected && username ? username : undefined} />
								</SelectItem>
								<SelectItem value='myanimelist' disabled>
									{t("anime.myAnimeList")}
								</SelectItem>
								<SelectItem value='kitsu' disabled>
									{t("anime.kitsu")}
								</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
					<FieldDescription>{connected ? t("onboarding.servicesUnavailableConnected") : t("onboarding.servicesUnavailable")}</FieldDescription>
					<FieldError errors={[fieldState.error]} />
				</Field>
			)}
		/>
	);
}

export function AniListAccountCard() {
	const { t } = useTranslation();
	const tokenId = useId();
	const [pasteOpen, setPasteOpen] = useState(false);
	const tokenForm = useForm<AnilistTokenInput, unknown, AnilistToken>({
		resolver: zodResolver(anilistTokenSchema),
		defaultValues: { token: "" },
	});
	const statusQuery = trpc.anilist.status.useQuery();
	const authorize = trpc.anilist.authorize.useMutation();
	const connectWithToken = trpc.anilist.connectWithToken.useMutation({
		onSuccess: async () => {
			tokenForm.reset({ token: "" });
			setPasteOpen(false);
			await statusQuery.refetch();
		},
	});
	const disconnect = trpc.anilist.disconnect.useMutation({
		onSuccess: async () => {
			await statusQuery.refetch();
		},
	});
	const connected = Boolean(statusQuery.data?.connected);
	const username = statusQuery.data?.username?.trim() ?? "";
	const avatarUrl = statusQuery.data?.avatarUrl?.trim() || null;
	const errorMessage = statusQuery.data?.loginError ?? authorize.error?.message ?? connectWithToken.error?.message ?? disconnect.error?.message ?? null;

	return (
		<Card>
			<CardContent className='flex flex-col gap-4'>
				<div className='flex items-center gap-3'>
					<AccountAvatar initials={connected && username ? profileInitials(username) : ""} avatarUrl={connected ? avatarUrl : null} className='size-9 shrink-0 text-sm' />
					<div className='min-w-0 flex-1'>
						<p className='truncate text-sm font-medium'>{connected ? username || t("anime.anilist") : t("onboarding.notConnected")}</p>
						<p className='truncate text-xs text-muted-foreground'>{connected ? t("onboarding.connected") : t("onboarding.authorizeHint")}</p>
					</div>
					{connected ? (
						<Button
							type='button'
							variant='outline'
							disabled={disconnect.isPending}
							onClick={() => {
								void disconnect.mutateAsync();
							}}>
							{t("onboarding.disconnect")}
						</Button>
					) : (
						<Button
							type='button'
							disabled={authorize.isPending}
							onClick={() => {
								void authorize.mutateAsync();
							}}>
							{t("onboarding.authorize")}
						</Button>
					)}
				</div>
				{connected ? null : (
					<div className='flex flex-col items-start gap-3'>
						<Button
							type='button'
							variant='link'
							aria-expanded={pasteOpen}
							className='h-auto px-0 text-foreground underline underline-offset-4'
							onClick={() => {
								setPasteOpen((open) => !open);
							}}>
							{t("onboarding.pasteTokenLink")}
						</Button>
						{pasteOpen ? (
							<FormProvider {...tokenForm}>
								<Controller
									control={tokenForm.control}
									name='token'
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid || undefined} className='w-full'>
											<FieldLabel htmlFor={tokenId}>{t("onboarding.accessToken")}</FieldLabel>
											<Textarea
												id={tokenId}
												rows={4}
												placeholder={t("onboarding.tokenPlaceholder")}
												aria-invalid={fieldState.invalid || undefined}
												name={field.name}
												ref={field.ref}
												onBlur={field.onBlur}
												value={typeof field.value === "string" ? field.value : ""}
												onChange={field.onChange}
											/>
											<FieldError errors={[fieldState.error]} />
										</Field>
									)}
								/>
								<div className='flex w-full justify-end'>
									<AniListConnectButton
										onConnect={() => {
											void tokenForm.handleSubmit((data) => {
												void connectWithToken.mutateAsync(data);
											})();
										}}
									/>
								</div>
							</FormProvider>
						) : null}
					</div>
				)}
				<DefaultServiceField connected={connected} username={username} />
				{errorMessage ? <p className='text-sm text-destructive'>{errorMessage}</p> : null}
			</CardContent>
		</Card>
	);
}

function AniListConnectButton({ onConnect }: { onConnect: () => void }) {
	const { t } = useTranslation();
	const { control } = useFormContext<AnilistTokenInput>();
	const { isSubmitting } = useFormState({ control });
	return (
		<Button type='button' disabled={isSubmitting} onClick={onConnect}>
			{t("onboarding.connect")}
		</Button>
	);
}
