import { useTranslation } from "@biyori/translations/react";
import { useNavigate } from "@tanstack/react-router";
import { desktopRpc } from "@/desktop-rpc";
import {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
} from "@/mainview/components/ui/menubar";
import { useTheme } from "@/mainview/lib/hooks/use-theme";
import { useAddLibraryFolder } from "@/mainview/lib/library-folder";
import { useSelectedAnime } from "@/mainview/lib/selected-anime";
import { setThemeMode } from "@/mainview/lib/theme";
import { useCheckForUpdates } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";

export function TopMenuBar() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const settingsQuery = trpc.settings.get.useQuery();
	const setSettings = trpc.settings.set.useMutation({
		onSuccess: (settings) => {
			utils.settings.get.setData(undefined, settings);
		},
	});
	const folders = settingsQuery.data?.libraryFolders ?? [];
	const addLibraryFolder = useAddLibraryFolder();
	const selected = useSelectedAnime();
	const scan = trpc.library.scan.useMutation();
	const scanAll = trpc.library.scanAll.useMutation();
	const playNext = trpc.library.playNext.useMutation();
	const playRandom = trpc.library.playRandom.useMutation();
	const [theme, _setTheme] = useTheme();
	const syncStatus = trpc.anilist.syncStatus.useQuery();
	const sync = trpc.anilist.sync.useMutation();
	const syncRunning = syncStatus.data?.phase === "running";
	const settings = settingsQuery.data;
	const { checking, checkForUpdates } = useCheckForUpdates();

	return (
		<div className='app-region-no-drag ml-3 flex h-full shrink-0 items-stretch'>
			<Menubar className='h-full gap-0 rounded-none border-none bg-transparent p-0'>
				<MenubarMenu>
					<MenubarTrigger>{t("shell.file")}</MenubarTrigger>
					<MenubarContent>
						<MenubarItem
							onClick={() => {
								void navigate({ to: "/app/library" });
							}}>
							{t("nav.library")}
						</MenubarItem>
						<MenubarSub>
							<MenubarSubTrigger>{t("shell.libraryFolders")}</MenubarSubTrigger>
							<MenubarSubContent>
								{folders.map((folder) => (
									<MenubarItem
										key={folder.path}
										onClick={() => {
											void desktopRpc.request.openPath({ path: folder.path });
										}}>
										{folder.path}
									</MenubarItem>
								))}
								<MenubarSeparator />
								<MenubarItem
									onClick={() => {
										window.setTimeout(() => {
											void addLibraryFolder.addFromPicker();
										}, 0);
									}}>
									{t("shell.addNewFolder")}
								</MenubarItem>
							</MenubarSubContent>
						</MenubarSub>
						<MenubarItem
							onClick={() => {
								void scan.mutateAsync();
							}}>
							{t("shell.scanAvailableEpisodes")}
						</MenubarItem>
						<MenubarItem
							onClick={() => {
								void scanAll.mutateAsync();
							}}>
							{t("shell.scanLibraryFolders")}
						</MenubarItem>
						<MenubarSeparator />
						<MenubarItem
							disabled={!selected}
							onClick={() => {
								if (!selected) {
									return;
								}
								void playNext.mutateAsync({
									animeId: selected.id,
									episodesWatched: selected.episodesWatched,
								});
							}}>
							{t("shell.playNextEpisode")}
							<MenubarShortcut>{t("shell.shortcutPlayNext")}</MenubarShortcut>
						</MenubarItem>
						<MenubarItem
							disabled={!selected}
							onClick={() => {
								if (!selected) {
									return;
								}
								void playRandom.mutateAsync({ animeId: selected.id });
							}}>
							{t("shell.playRandomEpisode")}
							<MenubarShortcut>{t("shell.shortcutPlayRandom")}</MenubarShortcut>
						</MenubarItem>
						<MenubarSeparator />
						<MenubarItem
							onClick={() => {
								void desktopRpc.request.closeWindow({});
							}}>
							{t("shell.exit")}
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger>{t("shell.services")}</MenubarTrigger>
					<MenubarContent>
						<MenubarItem
							disabled={syncRunning || sync.isPending}
							onClick={() => {
								void sync.mutateAsync();
							}}>
							{t("shell.synchronizeList")}
							<MenubarShortcut>{t("shell.shortcutSync")}</MenubarShortcut>
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger>{t("shell.view")}</MenubarTrigger>
					<MenubarContent>
						<MenubarSub>
							<MenubarSubTrigger>{t("shell.themes")}</MenubarSubTrigger>
							<MenubarSubContent>
								<MenubarRadioGroup
									value={theme}
									onValueChange={(value) => {
										if (value === "light" || value === "dark" || value === "system") {
											setThemeMode(value);
										}
									}}>
									<MenubarRadioItem value='light'>{t("shell.light")}</MenubarRadioItem>
									<MenubarRadioItem value='dark'>{t("shell.dark")}</MenubarRadioItem>
									<MenubarRadioItem value='system'>{t("shell.system")}</MenubarRadioItem>
								</MenubarRadioGroup>
							</MenubarSubContent>
						</MenubarSub>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger>{t("shell.tools")}</MenubarTrigger>
					<MenubarContent>
						<MenubarCheckboxItem
							checked={settings?.enableRecognition ?? true}
							onCheckedChange={(checked) => {
								if (!settings) {
									return;
								}
								void setSettings.mutateAsync({
									enableRecognition: Boolean(checked),
								});
							}}>
							{t("shell.enableAnimeRecognition")}
						</MenubarCheckboxItem>
						<MenubarCheckboxItem
							checked={settings?.updateRichPresence ?? true}
							onCheckedChange={(checked) => {
								if (!settings) {
									return;
								}
								void setSettings.mutateAsync({
									updateRichPresence: Boolean(checked),
								});
							}}>
							{t("shell.enableAutoSharing")}
						</MenubarCheckboxItem>
						<MenubarSeparator />
						<MenubarItem
							onClick={() => {
								void desktopRpc.request.openSettings({});
							}}>
							{t("shell.settings")}
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger>{t("shell.help")}</MenubarTrigger>
					<MenubarContent>
						<MenubarItem disabled={checking} onClick={checkForUpdates}>
							{t("shell.checkForUpdates")}
						</MenubarItem>
						<MenubarItem
							onClick={() => {
								void navigate({ to: "/app/about" });
							}}>
							{t("shell.aboutBiyori")}
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
		</div>
	);
}
