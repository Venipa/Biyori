import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { MEDIA_PLAYERS, STREAMING_PROVIDERS } from "@/lib/recognition-catalog";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { FormCheckbox } from "@/mainview/components/form-checkbox";
import { SettingsFieldError } from "@/mainview/components/settings/settings-field-error";
import { SettingsSectionCard } from "@/mainview/components/settings/settings-section-card";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import { Textarea } from "@/mainview/components/ui/textarea";

function toggleId(ids: string[], id: string, checked: boolean): string[] {
	if (checked) {
		return ids.includes(id) ? ids : [...ids, id];
	}
	return ids.filter((item) => item !== id);
}

export function RecognitionPanel() {
	const ignoreId = useId();
	const rangeId = useId();
	const delayId = useId();
	const enableId = useId();
	const confirmId = useId();
	const ignoredId = useId();
	const waitId = useId();
	const focusId = useId();
	const notifyOkId = useId();
	const gotoOkId = useId();
	const notifyBadId = useId();
	const gotoBadId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<>
			<SettingsSectionCard title='Recognition' description='Match playing media to titles on your list.'>
				<FormCheckbox control={form.control} name='enableRecognition' id={enableId} label='Enable media recognition' />
			</SettingsSectionCard>
			<SettingsSectionCard title='Validation'>
				<FormCheckbox control={form.control} name='ignoreOutsideLibrary' id={ignoreId} label='Ignore files outside of library folders' />
				<FormCheckbox control={form.control} name='ignoreOutOfRangeEpisode' id={rangeId} label='Ignore if episode number is greater than next episode' />
			</SettingsSectionCard>
			<SettingsSectionCard title='When an episode is recognized'>
				<FormCheckbox control={form.control} name='notifyOnRecognized' id={notifyOkId} label='Notify me' />
				<FormCheckbox control={form.control} name='goToNowPlayingOnRecognized' id={gotoOkId} label='Go to Now Playing' />
			</SettingsSectionCard>
			<SettingsSectionCard title='When an episode is not recognized'>
				<FormCheckbox control={form.control} name='notifyOnUnrecognized' id={notifyBadId} label='Notify me' />
				<FormCheckbox control={form.control} name='goToNowPlayingOnUnrecognized' id={gotoBadId} label='Go to Now Playing' />
			</SettingsSectionCard>
			<SettingsSectionCard title='List updates and sharing' description='Delay and extra checks before writing progress.'>
				<Field>
					<FieldLabel htmlFor={delayId}>Delay (seconds)</FieldLabel>
					<div className='flex items-center gap-2'>
						<Input
							id={delayId}
							type='number'
							className='w-20'
							{...form.register("recognitionDelaySeconds", {
								valueAsNumber: true,
							})}
						/>
					</div>
					<SettingsFieldError<AppSettingsInput> name='recognitionDelaySeconds' />
				</Field>
				<FormCheckbox control={form.control} name='playerMustBeInFocus' id={focusId} label='Media player must be in focus' />
				<FormCheckbox control={form.control} name='waitUntilPlayerExits' id={waitId} label='Wait for media player to close' />
				<FormCheckbox control={form.control} name='askToConfirmUpdate' id={confirmId} label='Ask for confirmation' />
			</SettingsSectionCard>
			<SettingsSectionCard title='Ignored strings' description='Strip these from titles before matching. One per line.'>
				<Field>
					<FieldLabel htmlFor={ignoredId} className='sr-only'>
						Ignored strings
					</FieldLabel>
					<Textarea id={ignoredId} className='min-h-20 font-mono text-xs' {...form.register("ignoredStrings")} />
					<SettingsFieldError<AppSettingsInput> name='ignoredStrings' />
				</Field>
			</SettingsSectionCard>
			<MediaPlayersFields />
			<StreamingFields />
		</>
	);
}

function MediaPlayersFields() {
	const playersEnableId = useId();
	const playersAllId = useId();
	const form = useFormContext<AppSettingsInput>();
	const playersEnabled = form.watch("enableMediaPlayerDetection");
	return (
		<SettingsSectionCard title='Media players' description='Select the players you use, deselect the others.'>
			<FormCheckbox control={form.control} name='enableMediaPlayerDetection' id={playersEnableId} label='Enable media player detection' />
			<Controller
				control={form.control}
				name='enabledMediaPlayers'
				render={({ field }) => {
					const selected = field.value ?? [];
					const selectedSet = new Set(selected);
					const allOn = MEDIA_PLAYERS.every((player) => selectedSet.has(player.id));
					return (
						<ul className='max-h-72 overflow-auto rounded-md border bg-background p-2' data-disabled={!playersEnabled || undefined}>
							<li className='border-b pb-1'>
								<Field orientation='horizontal'>
									<Checkbox
										id={playersAllId}
										disabled={!playersEnabled}
										checked={allOn}
										onCheckedChange={(checked) => {
											field.onChange(checked === true ? MEDIA_PLAYERS.map((player) => player.id) : []);
										}}
									/>
									<FieldLabel htmlFor={playersAllId} className='font-normal'>
										Select/deselect all
									</FieldLabel>
								</Field>
							</li>
							{MEDIA_PLAYERS.map((player) => {
								const itemId = `${playersAllId}-${player.id}`;
								return (
									<li key={player.id} className='pl-4'>
										<Field orientation='horizontal'>
											<Checkbox
												id={itemId}
												disabled={!playersEnabled}
												checked={selectedSet.has(player.id)}
												onCheckedChange={(checked) => {
													field.onChange(toggleId(selected, player.id, checked === true));
												}}
											/>
											<FieldLabel htmlFor={itemId} className='font-normal'>
												{player.label}
											</FieldLabel>
										</Field>
									</li>
								);
							})}
						</ul>
					);
				}}
			/>
		</SettingsSectionCard>
	);
}

function StreamingFields() {
	const streamEnableId = useId();
	const streamAllId = useId();
	const form = useFormContext<AppSettingsInput>();
	const streamingEnabled = form.watch("enableStreamingDetection");
	return (
		<SettingsSectionCard
			title='Streaming media'
			description='Supported browsers are Google Chrome, Mozilla Firefox, and Opera. Works best with a browser in English.'>
			<FormCheckbox control={form.control} name='enableStreamingDetection' id={streamEnableId} label='Enable streaming media detection' />
			<Controller
				control={form.control}
				name='enabledStreamingProviders'
				render={({ field }) => {
					const selected = field.value ?? [];
					const selectedSet = new Set(selected);
					const allOn = STREAMING_PROVIDERS.every((provider) => selectedSet.has(provider.id));
					return (
						<ul className='max-h-72 overflow-auto rounded-md border bg-background p-2'>
							<li className='border-b pb-1'>
								<Field orientation='horizontal'>
									<Checkbox
										id={streamAllId}
										disabled={!streamingEnabled}
										checked={allOn}
										onCheckedChange={(checked) => {
											field.onChange(checked === true ? STREAMING_PROVIDERS.map((provider) => provider.id) : []);
										}}
									/>
									<FieldLabel htmlFor={streamAllId} className='font-normal'>
										Select/deselect all
									</FieldLabel>
								</Field>
							</li>
							{STREAMING_PROVIDERS.map((provider) => {
								const itemId = `${streamAllId}-${provider.id}`;
								return (
									<li key={provider.id} className='pl-4'>
										<Field orientation='horizontal'>
											<Checkbox
												id={itemId}
												disabled={!streamingEnabled}
												checked={selectedSet.has(provider.id)}
												onCheckedChange={(checked) => {
													field.onChange(toggleId(selected, provider.id, checked === true));
												}}
											/>
											<FieldLabel htmlFor={itemId} className='font-normal'>
												{provider.label}
											</FieldLabel>
										</Field>
									</li>
								);
							})}
						</ul>
					);
				}}
			/>
		</SettingsSectionCard>
	);
}
