import { t, useTranslation } from "@biyori/translations/react";
import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { MEDIA_PLAYERS, STREAMING_PROVIDERS } from "@/lib/recognition-catalog";

function playerLabel(id: string): string {
	switch (id) {
		case "gom":
			return t("recognition.players.gom");
		case "kmplayer":
			return t("recognition.players.kmplayer");
		case "mpc-be":
			return t("recognition.players.mpcBe");
		case "mpc-hc":
			return t("recognition.players.mpcHc");
		case "mpc-qt":
			return t("recognition.players.mpcQt");
		case "mpcstar":
			return t("recognition.players.mpcstar");
		case "mpdn":
			return t("recognition.players.mpdn");
		case "mpv":
			return t("recognition.players.mpv");
		case "mpvnet":
			return t("recognition.players.mpvnet");
		case "mv2player":
			return t("recognition.players.mv2player");
		case "potplayer":
			return t("recognition.players.potplayer");
		case "smplayer":
			return t("recognition.players.smplayer");
		case "splash":
			return t("recognition.players.splash");
		case "splayer":
			return t("recognition.players.splayer");
		case "umplayer":
			return t("recognition.players.umplayer");
		case "vlc":
			return t("recognition.players.vlc");
		case "webtorrent":
			return t("recognition.players.webtorrent");
		case "winamp":
			return t("recognition.players.winamp");
		case "wmplayer":
			return t("recognition.players.wmplayer");
		case "zoomplayer":
			return t("recognition.players.zoomplayer");
		default:
			return id;
	}
}

function providerLabel(id: string): string {
	switch (id) {
		case "animelab":
			return t("recognition.providers.animelab");
		case "adn":
			return t("recognition.providers.adn");
		case "ann":
			return t("recognition.providers.ann");
		case "bilibili":
			return t("recognition.providers.bilibili");
		case "crunchyroll":
			return t("recognition.providers.crunchyroll");
		case "funimation":
			return t("recognition.providers.funimation");
		case "hidive":
			return t("recognition.providers.hidive");
		case "jellyfin":
			return t("recognition.providers.jellyfin");
		case "plex":
			return t("recognition.providers.plex");
		case "roku":
			return t("recognition.providers.roku");
		case "tubi":
			return t("recognition.providers.tubi");
		case "veoh":
			return t("recognition.providers.veoh");
		case "viz":
			return t("recognition.providers.viz");
		case "vrv":
			return t("recognition.providers.vrv");
		case "wakanim":
			return t("recognition.providers.wakanim");
		case "yahoo":
			return t("recognition.providers.yahoo");
		case "youtube":
			return t("recognition.providers.youtube");
		case "netflix":
			return t("recognition.providers.netflix");
		default:
			return id;
	}
}

import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { SettingsFieldError } from "@/mainview/components/app/settings/settings-field-error";
import { SettingsPageNav } from "@/mainview/components/app/settings/settings-page-nav";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { FormCheckbox } from "@/mainview/components/app/shared/form-checkbox";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Field, FieldLabel } from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import { Textarea } from "@/mainview/components/ui/textarea";

function toggleId(ids: string[], id: string, checked: boolean): string[] {
	if (checked) {
		return ids.includes(id) ? ids : [...ids, id];
	}
	return ids.filter((item) => item !== id);
}

export function RecognitionGeneralPanel() {
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
	const { t } = useTranslation();
	const form = useFormContext<AppSettingsInput>();

	return (
		<SettingsPageNav>
			<SettingsSectionCard id='enable' title={t("settings.recognition.title")} description={t("settings.recognition.description")}>
				<FormCheckbox control={form.control} name='enableRecognition' id={enableId} label={t("settings.recognition.enable")} />
			</SettingsSectionCard>
			<SettingsSectionCard id='validation' title={t("settings.recognition.validationTitle")}>
				<FormCheckbox control={form.control} name='ignoreOutsideLibrary' id={ignoreId} label={t("settings.recognition.ignoreOutside")} />
				<FormCheckbox control={form.control} name='ignoreOutOfRangeEpisode' id={rangeId} label={t("settings.recognition.ignoreRange")} />
			</SettingsSectionCard>
			<SettingsSectionCard id='recognized' title={t("settings.recognition.recognizedTitle")}>
				<FormCheckbox control={form.control} name='notifyOnRecognized' id={notifyOkId} label={t("settings.recognition.notify")} />
				<FormCheckbox control={form.control} name='goToNowPlayingOnRecognized' id={gotoOkId} label={t("settings.recognition.goToNowPlaying")} />
			</SettingsSectionCard>
			<SettingsSectionCard id='unrecognized' title={t("settings.recognition.unrecognizedTitle")}>
				<FormCheckbox control={form.control} name='notifyOnUnrecognized' id={notifyBadId} label={t("settings.recognition.notify")} />
				<FormCheckbox control={form.control} name='goToNowPlayingOnUnrecognized' id={gotoBadId} label={t("settings.recognition.goToNowPlaying")} />
			</SettingsSectionCard>
			<SettingsSectionCard id='updates' title={t("settings.recognition.updatesTitle")} description={t("settings.recognition.updatesDescription")}>
				<Field>
					<FieldLabel htmlFor={delayId}>{t("settings.recognition.delay")}</FieldLabel>
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
				<FormCheckbox control={form.control} name='playerMustBeInFocus' id={focusId} label={t("settings.recognition.mustFocus")} />
				<FormCheckbox control={form.control} name='waitUntilPlayerExits' id={waitId} label={t("settings.recognition.waitExit")} />
				<FormCheckbox control={form.control} name='askToConfirmUpdate' id={confirmId} label={t("settings.recognition.confirm")} />
			</SettingsSectionCard>
			<SettingsSectionCard id='ignored' title={t("settings.recognition.ignoredTitle")} description={t("settings.recognition.ignoredDescription")}>
				<Field>
					<FieldLabel htmlFor={ignoredId} className='sr-only'>
						{t("settings.recognition.ignoredLabel")}
					</FieldLabel>
					<Textarea id={ignoredId} className='min-h-20 font-mono text-xs' {...form.register("ignoredStrings")} />
					<SettingsFieldError<AppSettingsInput> name='ignoredStrings' />
				</Field>
			</SettingsSectionCard>
		</SettingsPageNav>
	);
}

export function RecognitionSourcesPanel() {
	return (
		<SettingsPageNav>
			<MediaPlayersFields />
			<StreamingFields />
		</SettingsPageNav>
	);
}

function MediaPlayersFields() {
	const playersEnableId = useId();
	const playersAllId = useId();
	const { t } = useTranslation();
	const form = useFormContext<AppSettingsInput>();
	const playersEnabled = form.watch("enableMediaPlayerDetection");
	return (
		<SettingsSectionCard id='players' title={t("settings.recognition.playersTitle")} description={t("settings.recognition.playersDescription")}>
			<FormCheckbox control={form.control} name='enableMediaPlayerDetection' id={playersEnableId} label={t("settings.recognition.enablePlayers")} />
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
										{t("settings.recognition.selectAll")}
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
												{playerLabel(player.id)}
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
	const { t } = useTranslation();
	const form = useFormContext<AppSettingsInput>();
	const streamingEnabled = form.watch("enableStreamingDetection");
	return (
		<SettingsSectionCard id='streaming' title={t("settings.recognition.streamingTitle")} description={t("settings.recognition.streamingDescription")}>
			<FormCheckbox control={form.control} name='enableStreamingDetection' id={streamEnableId} label={t("settings.recognition.enableStreaming")} />
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
										{t("settings.recognition.selectAll")}
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
												{providerLabel(provider.id)}
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
