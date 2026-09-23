import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { Controller, FormProvider, useForm, useFormContext, useFormState } from "react-hook-form";
import { profileInitials } from "@/lib/profile-initials";
import { type AnilistToken, type AnilistTokenInput, anilistTokenSchema } from "@/lib/schemas/anilist-token";
import type { AppSettingsInput, DefaultService } from "@/lib/schemas/app-settings";
import { Button } from "@/mainview/components/ui/button";
import { Card, CardContent } from "@/mainview/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { Image } from "@/mainview/components/ui/image";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";
import { Textarea } from "@/mainview/components/ui/textarea";
import { trpc } from "@/mainview/trpc";

const SERVICE_LABELS = {
	anilist: "AniList",
	myanimelist: "MyAnimeList",
	kitsu: "Kitsu",
} as const satisfies Record<DefaultService, string>;

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

export function AniListAccountCard() {
	const serviceId = useId();
	const tokenId = useId();
	const settingsForm = useFormContext<AppSettingsInput>();
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
					<span className='relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium'>
						{connected && username ? profileInitials(username) : null}
						{connected && avatarUrl ? <Image src={avatarUrl} alt='' className='absolute inset-0 size-full rounded-full' skeletonClassName='rounded-full' /> : null}
					</span>
					<div className='min-w-0 flex-1'>
						<p className='truncate text-sm font-medium'>{connected ? username || "AniList" : "Not connected"}</p>
						<p className='truncate text-xs text-muted-foreground'>{connected ? "Connected" : "Authorize opens your browser and returns here."}</p>
					</div>
					{connected ? (
						<Button
							type='button'
							variant='outline'
							disabled={disconnect.isPending}
							onClick={() => {
								void disconnect.mutateAsync();
							}}>
							Disconnect
						</Button>
					) : (
						<Button
							type='button'
							disabled={authorize.isPending}
							onClick={() => {
								void authorize.mutateAsync();
							}}>
							Authorize
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
							or paste access token/redirect url
						</Button>
						{pasteOpen ? (
							<FormProvider {...tokenForm}>
								<Controller
									control={tokenForm.control}
									name='token'
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid || undefined} className='w-full'>
											<FieldLabel htmlFor={tokenId}>Access token</FieldLabel>
											<Textarea
												id={tokenId}
												rows={4}
												placeholder='Paste the access token or the full redirect URL'
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
				<Controller
					control={settingsForm.control}
					name='defaultService'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={serviceId}>Default service</FieldLabel>
							<Select
								value={serviceValue(field.value)}
								items={SERVICE_LABELS}
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
											return <ServiceOption label={SERVICE_LABELS[service]} detail={detail} />;
										}}
									</SelectValue>
								</SelectTrigger>
								<SelectContent align='start'>
									<SelectGroup>
										<SelectItem value='anilist'>
											<ServiceOption label='AniList' detail={connected && username ? username : undefined} />
										</SelectItem>
										<SelectItem value='myanimelist' disabled>
											MyAnimeList
										</SelectItem>
										<SelectItem value='kitsu' disabled>
											Kitsu
										</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
							<FieldDescription>
								{connected
									? "MyAnimeList and Kitsu are not available yet. Disconnect applies immediately and is not included when you Save other settings."
									: "MyAnimeList and Kitsu are not available yet."}
							</FieldDescription>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
				{errorMessage ? <p className='text-sm text-destructive'>{errorMessage}</p> : null}
			</CardContent>
		</Card>
	);
}

function AniListConnectButton({ onConnect }: { onConnect: () => void }) {
	const { control } = useFormContext<AnilistTokenInput>();
	const { isSubmitting } = useFormState({ control });
	return (
		<Button type='button' disabled={isSubmitting} onClick={onConnect}>
			Connect
		</Button>
	);
}
