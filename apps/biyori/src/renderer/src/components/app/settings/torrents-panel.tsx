import { t, useTranslation } from "@biyori/translations/react";
import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { TORRENT_RELEASE_FEEDS, TORRENT_SEARCH_FEEDS, type TorrentFeedOption, torrentSearchUrlForFeed } from "@/lib/torrent-feeds";

function feedLabel(id: string): string {
	switch (id) {
		case "nyaa":
			return t("feeds.nyaa");
		case "subsplease":
			return t("feeds.subsplease");
		case "tokyotosho":
			return t("feeds.tokyotosho");
		case "anidex":
			return t("feeds.anidex");
		case "nyaanet":
			return t("feeds.nyaanet");
		default:
			return id;
	}
}

function feedOptions(feeds: readonly TorrentFeedOption[]): Array<{ value: string; label: string }> {
	return feeds.map((feed) => ({ value: feed.value, label: feedLabel(feed.id) }));
}

import { SettingsFieldError } from "@/mainview/components/app/settings/settings-field-error";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { SettingsToggleGroup } from "@/mainview/components/app/settings/settings-toggle-group";
import { EditableSelect } from "@/mainview/components/app/shared/editable-select";
import { FormCheckbox } from "@/mainview/components/app/shared/form-checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@/mainview/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@/mainview/components/ui/radio-group";
import { pickFilePath, pickLibraryFolderPath } from "@/mainview/lib/library-folder";
import { TorrentFiltersTab } from "./torrent-filters-tab";

export function TorrentsGeneralPanel() {
	const { t } = useTranslation();
	const sortByOptions = [
		{ value: "episode_number", label: t("settings.torrents.episodeNumber") },
		{ value: "release_date", label: t("settings.torrents.releaseDate") },
	];
	const sortOrderOptions = [
		{ value: "ascending", label: t("settings.torrents.ascending") },
		{ value: "descending", label: t("settings.torrents.descending") },
	];
	const rssId = useId();
	const searchId = useId();
	const checkId = useId();
	const intervalId = useId();
	const notifyId = useId();
	const downloadId = useId();
	const sortById = useId();
	const sortOrderId = useId();
	const useAnimeFolderId = useId();
	const fallbackId = useId();
	const createSubId = useId();
	const appOpenId = useId();
	const appDefaultId = useId();
	const appCustomId = useId();
	const appPathId = useId();
	const downloadDirId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<>
			<SettingsSectionCard title={t("settings.torrents.sourcesTitle")} description={t("settings.torrents.sourcesDescription")}>
				<Controller
					control={form.control}
					name='rssFeedUrl'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={rssId}>{t("settings.torrents.rssCheck")}</FieldLabel>
							<EditableSelect
								id={rssId}
								value={typeof field.value === "string" ? field.value : ""}
								onChange={(next) => {
									field.onChange(next);
									form.setValue("rssSearchUrl", torrentSearchUrlForFeed(next), { shouldDirty: true });
								}}
								options={feedOptions(TORRENT_RELEASE_FEEDS)}
								invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
				<Controller
					control={form.control}
					name='rssSearchUrl'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={searchId}>{t("settings.torrents.rssSearch")}</FieldLabel>
							<EditableSelect
								id={searchId}
								value={typeof field.value === "string" ? field.value : ""}
								onChange={field.onChange}
								options={feedOptions(TORRENT_SEARCH_FEEDS)}
								invalid={fieldState.invalid}
							/>
							<FieldDescription>{t("settings.torrents.searchHint")}</FieldDescription>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.torrents.automationTitle")}>
				<FormCheckbox control={form.control} name='checkTorrentsAutomatically' id={checkId} label={t("settings.torrents.checkAuto")} />
				<Field>
					<FieldLabel htmlFor={intervalId}>{t("settings.torrents.interval")}</FieldLabel>
					<InputGroup className='w-40'>
						<InputGroupInput
							id={intervalId}
							type='number'
							{...form.register("torrentCheckIntervalMinutes", {
								valueAsNumber: true,
							})}
						/>
						<InputGroupAddon align='inline-end'>
							<InputGroupText>{t("settings.torrents.minutes")}</InputGroupText>
						</InputGroupAddon>
					</InputGroup>
					<SettingsFieldError<AppSettingsInput> name='torrentCheckIntervalMinutes' />
				</Field>
				<Controller
					control={form.control}
					name='newTorrentAction'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel>{t("settings.torrents.whenNew")}</FieldLabel>
							<RadioGroup
								value={field.value}
								onValueChange={(value) => {
									if (typeof value === "string") {
										field.onChange(value);
									}
								}}>
								<Field orientation='horizontal'>
									<RadioGroupItem value='notify' id={notifyId} />
									<FieldLabel htmlFor={notifyId} className='font-normal'>
										{t("settings.torrents.notify")}
									</FieldLabel>
								</Field>
								<Field orientation='horizontal'>
									<RadioGroupItem value='download' id={downloadId} />
									<FieldLabel htmlFor={downloadId} className='font-normal'>
										{t("settings.torrents.downloadNow")}
									</FieldLabel>
								</Field>
							</RadioGroup>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.torrents.queueTitle")}>
				<Controller
					control={form.control}
					name='torrentDownloadSortBy'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={sortById}>{t("settings.torrents.sortBy")}</FieldLabel>
							<SettingsToggleGroup
								id={sortById}
								value={typeof field.value === "string" ? field.value : "episode_number"}
								onValueChange={field.onChange}
								options={sortByOptions}
								aria-invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
				<Controller
					control={form.control}
					name='torrentDownloadSortOrder'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={sortOrderId}>{t("settings.torrents.order")}</FieldLabel>
							<SettingsToggleGroup
								id={sortOrderId}
								value={typeof field.value === "string" ? field.value : "ascending"}
								onValueChange={field.onChange}
								options={sortOrderOptions}
								aria-invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<DownloadLocationFields useAnimeFolderId={useAnimeFolderId} fallbackId={fallbackId} downloadDirId={downloadDirId} createSubId={createSubId} />
			<TorrentClientFields appOpenId={appOpenId} appDefaultId={appDefaultId} appCustomId={appCustomId} appPathId={appPathId} />
		</>
	);
}

export function TorrentsFiltersPanel() {
	const { t } = useTranslation();
	return (
		<SettingsSectionCard title={t("settings.torrents.filtersTitle")} description={t("settings.torrents.filtersDescription")}>
			<TorrentFiltersTab />
		</SettingsSectionCard>
	);
}

function DownloadLocationFields({
	useAnimeFolderId,
	fallbackId,
	downloadDirId,
	createSubId,
}: {
	useAnimeFolderId: string;
	fallbackId: string;
	downloadDirId: string;
	createSubId: string;
}) {
	const { t } = useTranslation();
	const form = useFormContext<AppSettingsInput>();
	const useAnimeFolder = form.watch("torrentUseAnimeFolder");
	const fallbackOnFolder = form.watch("torrentFallbackOnFolder");
	const folderEnabled = Boolean(useAnimeFolder && fallbackOnFolder);
	return (
		<SettingsSectionCard title={t("settings.torrents.locationTitle")} description={t("settings.torrents.locationDescription")}>
			<FormCheckbox control={form.control} name='torrentUseAnimeFolder' id={useAnimeFolderId} label={t("settings.torrents.useAnimeFolder")} />
			<FormCheckbox control={form.control} name='torrentFallbackOnFolder' id={fallbackId} label={t("settings.torrents.fallback")} />
			<Field data-disabled={!folderEnabled || undefined}>
				<FieldLabel htmlFor={downloadDirId} className='sr-only'>
					{t("settings.torrents.fallbackFolder")}
				</FieldLabel>
				<InputGroup>
					<InputGroupInput id={downloadDirId} disabled={!folderEnabled} {...form.register("torrentDownloadDir")} />
					<InputGroupAddon align='inline-end'>
						<InputGroupButton
							variant='outline'
							disabled={!folderEnabled}
							onClick={() => {
								void pickLibraryFolderPath().then((path) => {
									if (path) {
										form.setValue("torrentDownloadDir", path, {
											shouldDirty: true,
										});
									}
								});
							}}>
							{t("settings.torrents.browse")}
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
				<SettingsFieldError<AppSettingsInput> name='torrentDownloadDir' />
			</Field>
			<FormCheckbox control={form.control} name='torrentCreateSubfolder' id={createSubId} label={t("settings.torrents.createSubfolder")} />
		</SettingsSectionCard>
	);
}

function TorrentClientFields({ appOpenId, appDefaultId, appCustomId, appPathId }: { appOpenId: string; appDefaultId: string; appCustomId: string; appPathId: string }) {
	const { t } = useTranslation();
	const form = useFormContext<AppSettingsInput>();
	const appMode = form.watch("torrentAppMode");
	const customApp = appMode === "custom";
	return (
		<SettingsSectionCard title={t("settings.torrents.clientTitle")}>
			<FormCheckbox control={form.control} name='torrentAppOpen' id={appOpenId} label={t("settings.torrents.openTorrent")} />
			<Controller
				control={form.control}
				name='torrentAppMode'
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid || undefined}>
						<RadioGroup
							value={field.value}
							onValueChange={(value) => {
								if (typeof value === "string") {
									field.onChange(value);
								}
							}}>
							<Field orientation='horizontal'>
								<RadioGroupItem value='default' id={appDefaultId} />
								<FieldLabel htmlFor={appDefaultId} className='font-normal'>
									{t("settings.torrents.defaultApp")}
								</FieldLabel>
							</Field>
							<Field orientation='horizontal'>
								<RadioGroupItem value='custom' id={appCustomId} />
								<FieldLabel htmlFor={appCustomId} className='font-normal'>
									{t("settings.torrents.customApp")}
								</FieldLabel>
							</Field>
						</RadioGroup>
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>
			<Field data-disabled={!customApp || undefined}>
				<FieldLabel htmlFor={appPathId} className='sr-only'>
					{t("settings.torrents.clientPath")}
				</FieldLabel>
				<InputGroup>
					<InputGroupInput id={appPathId} disabled={!customApp} {...form.register("torrentAppPath")} />
					<InputGroupAddon align='inline-end'>
						<InputGroupButton
							variant='outline'
							disabled={!customApp}
							onClick={() => {
								void pickFilePath().then((path) => {
									if (path) {
										form.setValue("torrentAppPath", path, {
											shouldDirty: true,
										});
									}
								});
							}}>
							{t("settings.torrents.browse")}
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
				<SettingsFieldError<AppSettingsInput> name='torrentAppPath' />
			</Field>
		</SettingsSectionCard>
	);
}
