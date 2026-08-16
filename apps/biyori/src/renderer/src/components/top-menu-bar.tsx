import { useSyncExternalStore } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarCheckboxItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarShortcut,
	MenubarTrigger,
} from "@/mainview/components/ui/menubar";
import { desktopRpc } from "@/desktop-rpc";
import { getThemeMode, setThemeMode, subscribeTheme } from "@/mainview/lib/theme";
import { useAddLibraryFolder } from "@/mainview/lib/library-folder";
import { useSelectedAnime } from "@/mainview/lib/selected-anime";
import { trpc } from "@/mainview/trpc";

export function TopMenuBar() {
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
	const playNext = trpc.library.playNext.useMutation();
	const playRandom = trpc.library.playRandom.useMutation();
	const theme = useSyncExternalStore(subscribeTheme, getThemeMode, getThemeMode);
	const syncStatus = trpc.anilist.syncStatus.useQuery();
	const sync = trpc.anilist.sync.useMutation();
	const syncRunning = syncStatus.data?.phase === "running";
	const settings = settingsQuery.data;

	return (
		<div className="flex h-9 shrink-0 items-center border-b bg-card px-2">
			<Menubar className="h-auto border-none bg-transparent p-0">
				<MenubarMenu>
					<MenubarTrigger>File</MenubarTrigger>
					<MenubarContent>
						<MenubarSub>
							<MenubarSubTrigger>Library folders</MenubarSubTrigger>
							<MenubarSubContent>
								{folders.map((folder) => (
									<MenubarItem
										key={folder.path}
										onClick={() => {
											void desktopRpc.request.openPath({ path: folder.path });
										}}
									>
										{folder.path}
									</MenubarItem>
								))}
								<MenubarSeparator />
								<MenubarItem
									onClick={() => {
										void addLibraryFolder.addFromPicker();
									}}
								>
									Add new folder...
								</MenubarItem>
							</MenubarSubContent>
						</MenubarSub>
						<MenubarItem
							onClick={() => {
								void scan.mutateAsync();
							}}
						>
							Scan available episodes
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
							}}
						>
							Play next episode
							<MenubarShortcut>Ctrl+N</MenubarShortcut>
						</MenubarItem>
						<MenubarItem
							disabled={!selected}
							onClick={() => {
								if (!selected) {
									return;
								}
								void playRandom.mutateAsync({ animeId: selected.id });
							}}
						>
							Play random episode
							<MenubarShortcut>Ctrl+R</MenubarShortcut>
						</MenubarItem>
						<MenubarSeparator />
						<MenubarItem
							onClick={() => {
								void desktopRpc.request.closeWindow({});
							}}
						>
							Exit
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger>Services</MenubarTrigger>
					<MenubarContent>
						<MenubarItem
							disabled={syncRunning || sync.isPending}
							onClick={() => {
								void sync.mutateAsync();
							}}
						>
							Synchronize list
							<MenubarShortcut>Ctrl+S</MenubarShortcut>
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger>View</MenubarTrigger>
					<MenubarContent>
						<MenubarSub>
							<MenubarSubTrigger>Themes</MenubarSubTrigger>
							<MenubarSubContent>
								<MenubarRadioGroup
									value={theme}
									onValueChange={(value) => {
										if (
											value === "light" ||
											value === "dark" ||
											value === "system"
										) {
											setThemeMode(value);
										}
									}}
								>
									<MenubarRadioItem value="light">Light</MenubarRadioItem>
									<MenubarRadioItem value="dark">Dark</MenubarRadioItem>
									<MenubarRadioItem value="system">System</MenubarRadioItem>
								</MenubarRadioGroup>
							</MenubarSubContent>
						</MenubarSub>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger>Tools</MenubarTrigger>
					<MenubarContent>
						<MenubarCheckboxItem
							checked={settings?.enableRecognition ?? true}
							onCheckedChange={(checked) => {
								if (!settings) {
									return;
								}
								void setSettings.mutateAsync({
									...settings,
									enableRecognition: Boolean(checked),
								});
							}}
						>
							Enable anime recognition
						</MenubarCheckboxItem>
						<MenubarCheckboxItem
							checked={settings?.updateRichPresence ?? true}
							onCheckedChange={(checked) => {
								if (!settings) {
									return;
								}
								void setSettings.mutateAsync({
									...settings,
									updateRichPresence: Boolean(checked),
								});
							}}
						>
							Enable auto sharing
						</MenubarCheckboxItem>
						<MenubarSeparator />
						<MenubarItem
							onClick={() => {
								void desktopRpc.request.openSettings({});
							}}
						>
							Settings
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger>Help</MenubarTrigger>
					<MenubarContent>
						<MenubarItem
							onClick={() => {
								void navigate({ to: "/app/about" });
							}}
						>
							About Biyori
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
		</div>
	);
}
