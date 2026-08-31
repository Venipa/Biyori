import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { Controller, FormProvider, useForm, useFormContext, useFormState } from "react-hook-form";
import { type AnilistToken, type AnilistTokenInput, anilistTokenSchema } from "@/lib/schemas/anilist-token";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { SettingsSectionCard } from "@/mainview/components/settings/settings-section-card";
import { SettingsToggleGroup } from "@/mainview/components/settings/settings-toggle-group";
import { Button } from "@/mainview/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import { Textarea } from "@/mainview/components/ui/textarea";
import { trpc } from "@/mainview/trpc";

const DEFAULT_SERVICE_OPTIONS = [
	{ value: "anilist", label: "AniList" },
	{ value: "myanimelist", label: "MyAnimeList", disabled: true },
	{ value: "kitsu", label: "Kitsu", disabled: true },
] as const;

export function ServicesPanel() {
	const serviceId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<>
			<SettingsSectionCard title='Default list service' description='Choose which service your list, updates, and synchronization use by default.'>
				<Controller
					control={form.control}
					name='defaultService'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={serviceId}>Default service</FieldLabel>
							<SettingsToggleGroup
								id={serviceId}
								value={typeof field.value === "string" ? field.value : "anilist"}
								onValueChange={field.onChange}
								options={DEFAULT_SERVICE_OPTIONS}
								aria-invalid={fieldState.invalid}
							/>
							<FieldDescription>MyAnimeList and Kitsu are not available yet.</FieldDescription>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<AniListAccountCard />
		</>
	);
}

function AniListAccountCard() {
	const usernameId = useId();
	const tokenId = useId();
	const tokenForm = useForm<AnilistTokenInput, unknown, AnilistToken>({
		resolver: zodResolver(anilistTokenSchema),
		defaultValues: { token: "" },
	});
	const statusQuery = trpc.anilist.status.useQuery();
	const authorize = trpc.anilist.authorize.useMutation();
	const connectWithToken = trpc.anilist.connectWithToken.useMutation({
		onSuccess: async () => {
			tokenForm.reset({ token: "" });
			await statusQuery.refetch();
		},
	});
	const disconnect = trpc.anilist.disconnect.useMutation({
		onSuccess: async () => {
			await statusQuery.refetch();
		},
	});
	const connected = Boolean(statusQuery.data?.connected);
	const username = statusQuery.data?.username ?? "";
	const errorMessage = statusQuery.data?.loginError ?? authorize.error?.message ?? connectWithToken.error?.message ?? disconnect.error?.message ?? null;

	return (
		<SettingsSectionCard title='AniList' description='Connect or disconnect immediately. This is not included when you Save other settings.'>
			{connected ? (
				<Field>
					<FieldLabel htmlFor={usernameId}>Username</FieldLabel>
					<div className='flex items-center gap-2'>
						<Input id={usernameId} value={username} readOnly className='pointer-events-none flex-1 select-none' />
						<Button
							type='button'
							variant='outline'
							className='shrink-0'
							disabled={disconnect.isPending}
							onClick={() => {
								void disconnect.mutateAsync();
							}}>
							Disconnect
						</Button>
					</div>
				</Field>
			) : (
				<FormProvider {...tokenForm}>
					<div className='flex flex-col gap-3'>
						<Controller
							control={tokenForm.control}
							name='token'
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid || undefined}>
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
						<div className='flex items-center gap-2'>
							<Button
								type='button'
								variant='outline'
								disabled={authorize.isPending}
								onClick={() => {
									void authorize.mutateAsync();
								}}>
								Authorize...
							</Button>
							<AniListConnectButton
								onConnect={() => {
									void tokenForm.handleSubmit((data) => {
										void connectWithToken.mutateAsync(data);
									})();
								}}
							/>
						</div>
						<FieldDescription>
							Authorize opens your browser. After login, copy the token from the address bar (or the token itself), paste it here, then Connect.
						</FieldDescription>
					</div>
				</FormProvider>
			)}
			{errorMessage ? <p className='text-sm text-destructive'>{errorMessage}</p> : null}
		</SettingsSectionCard>
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
