import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { TORRENT_RELEASE_FEEDS, TORRENT_SEARCH_FEEDS } from "@/lib/torrent-feeds";
import { EditableSelect } from "@/mainview/components/editable-select";
import { FormCheckbox } from "@/mainview/components/form-checkbox";
import { SettingsFieldError } from "@/mainview/components/settings/settings-field-error";
import { SettingsSectionCard } from "@/mainview/components/settings/settings-section-card";
import { SettingsToggleGroup } from "@/mainview/components/settings/settings-toggle-group";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@/mainview/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@/mainview/components/ui/radio-group";
import { pickFilePath, pickLibraryFolderPath } from "@/mainview/lib/library-folder";
import { TorrentFiltersTab } from "./torrent-filters-tab";

const TORRENT_SORT_BY_OPTIONS = [
	{ value: "episode_number", label: "Episode number" },
	{ value: "release_date", label: "Release date" },
] as const;

const TORRENT_SORT_ORDER_OPTIONS = [
	{ value: "ascending", label: "Ascending" },
	{ value: "descending", label: "Descending" },
] as const;

export function TorrentsGeneralPanel() {
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
			<SettingsSectionCard title='Sources' description='RSS feeds used to find new releases.'>
				<Controller
					control={form.control}
					name='rssFeedUrl'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={rssId}>RSS feed for checking new releases</FieldLabel>
							<EditableSelect
								id={rssId}
								value={typeof field.value === "string" ? field.value : ""}
								onChange={field.onChange}
								options={TORRENT_RELEASE_FEEDS}
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
							<FieldLabel htmlFor={searchId}>RSS feed for searching a title</FieldLabel>
							<EditableSelect
								id={searchId}
								value={typeof field.value === "string" ? field.value : ""}
								onChange={field.onChange}
								options={TORRENT_SEARCH_FEEDS}
								invalid={fieldState.invalid}
							/>
							<FieldDescription>Use %title% as the search string.</FieldDescription>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title='Automation'>
				<FormCheckbox control={form.control} name='checkTorrentsAutomatically' id={checkId} label='Check new torrents automatically' />
				<Field>
					<FieldLabel htmlFor={intervalId}>Interval</FieldLabel>
					<InputGroup className='w-40'>
						<InputGroupInput
							id={intervalId}
							type='number'
							{...form.register("torrentCheckIntervalMinutes", {
								valueAsNumber: true,
							})}
						/>
						<InputGroupAddon align='inline-end'>
							<InputGroupText>(minutes)</InputGroupText>
						</InputGroupAddon>
					</InputGroup>
					<SettingsFieldError<AppSettingsInput> name='torrentCheckIntervalMinutes' />
				</Field>
				<Controller
					control={form.control}
					name='newTorrentAction'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel>When there are new torrents</FieldLabel>
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
										Notify me
									</FieldLabel>
								</Field>
								<Field orientation='horizontal'>
									<RadioGroupItem value='download' id={downloadId} />
									<FieldLabel htmlFor={downloadId} className='font-normal'>
										Download immediately
									</FieldLabel>
								</Field>
							</RadioGroup>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title='Download queue'>
				<Controller
					control={form.control}
					name='torrentDownloadSortBy'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={sortById}>Sort by</FieldLabel>
							<SettingsToggleGroup
								id={sortById}
								value={typeof field.value === "string" ? field.value : "episode_number"}
								onValueChange={field.onChange}
								options={TORRENT_SORT_BY_OPTIONS}
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
							<FieldLabel htmlFor={sortOrderId}>Order</FieldLabel>
							<SettingsToggleGroup
								id={sortOrderId}
								value={typeof field.value === "string" ? field.value : "ascending"}
								onValueChange={field.onChange}
								options={TORRENT_SORT_ORDER_OPTIONS}
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
	return (
		<SettingsSectionCard title='Filters' description='Download the files you want and ignore the others.'>
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
	const form = useFormContext<AppSettingsInput>();
	const useAnimeFolder = form.watch("torrentUseAnimeFolder");
	const fallbackOnFolder = form.watch("torrentFallbackOnFolder");
	const folderEnabled = Boolean(useAnimeFolder && fallbackOnFolder);
	return (
		<SettingsSectionCard title='Download location' description='Supported clients: aria2, Deluge, PicoTorrent, qBittorrent, Transmission, uTorrent.'>
			<FormCheckbox control={form.control} name='torrentUseAnimeFolder' id={useAnimeFolderId} label='Use anime folders as the download folder' />
			<FormCheckbox control={form.control} name='torrentFallbackOnFolder' id={fallbackId} label='If no anime folder is set, use this folder instead:' />
			<Field data-disabled={!folderEnabled || undefined}>
				<FieldLabel htmlFor={downloadDirId} className='sr-only'>
					Fallback download folder
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
							Browse...
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
				<SettingsFieldError<AppSettingsInput> name='torrentDownloadDir' />
			</Field>
			<FormCheckbox control={form.control} name='torrentCreateSubfolder' id={createSubId} label='Create a subfolder using the anime title as its name' />
		</SettingsSectionCard>
	);
}

function TorrentClientFields({ appOpenId, appDefaultId, appCustomId, appPathId }: { appOpenId: string; appDefaultId: string; appCustomId: string; appPathId: string }) {
	const form = useFormContext<AppSettingsInput>();
	const appMode = form.watch("torrentAppMode");
	const customApp = appMode === "custom";
	return (
		<SettingsSectionCard title='BitTorrent client'>
			<FormCheckbox control={form.control} name='torrentAppOpen' id={appOpenId} label='Open downloaded .torrent files' />
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
									Use the default application associated with .torrent files
								</FieldLabel>
							</Field>
							<Field orientation='horizontal'>
								<RadioGroupItem value='custom' id={appCustomId} />
								<FieldLabel htmlFor={appCustomId} className='font-normal'>
									Use a custom application:
								</FieldLabel>
							</Field>
						</RadioGroup>
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>
			<Field data-disabled={!customApp || undefined}>
				<FieldLabel htmlFor={appPathId} className='sr-only'>
					BitTorrent client path
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
							Browse...
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
				<SettingsFieldError<AppSettingsInput> name='torrentAppPath' />
			</Field>
		</SettingsSectionCard>
	);
}
