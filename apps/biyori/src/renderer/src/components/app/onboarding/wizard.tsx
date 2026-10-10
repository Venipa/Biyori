import { t, useTranslation } from "@biyori/translations/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeftIcon, FolderIcon, FolderPlusIcon, Trash2Icon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Controller, FormProvider, useForm, useFormContext, useFormState } from "react-hook-form";
import AnilistIcon from "@/assets/anilist.svg?react";
import MyAnimeListIcon from "@/assets/mal.svg?react";
import { folderDisplayName } from "@/lib/folder-path";
import { type AnilistToken, type AnilistTokenInput, anilistTokenSchema } from "@/lib/schemas/anilist-token";
import { titleLanguageSchema } from "@/lib/schemas/app-settings";
import { SettingsToggleGroup } from "@/mainview/components/app/settings/settings-toggle-group";
import Logo from "@/mainview/components/app/shell/logo";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/mainview/components/ui/field";
import { Progress, ProgressLabel, ProgressValue } from "@/mainview/components/ui/progress";
import { Textarea } from "@/mainview/components/ui/textarea";
import { useTheme } from "@/mainview/lib/hooks/use-theme";
import { useAddLibraryFolder } from "@/mainview/lib/library-folder";
import { THEME_MODES, type ThemeMode } from "@/mainview/lib/theme";
import { trpc } from "@/mainview/trpc";

const STEP_COUNT = 5;

function themeOptions() {
	return THEME_MODES.map((value) => ({
		value,
		label: value === "system" ? t("onboarding.system") : value === "light" ? t("onboarding.light") : t("onboarding.dark"),
	}));
}

function titleLanguageOptions() {
	return titleLanguageSchema.options.map((value) => ({
		value,
		label: value === "Romaji" ? t("onboarding.romaji") : value === "English" ? t("onboarding.english") : t("onboarding.native"),
	}));
}

function crashReportOptions() {
	return [
		{ value: "send" as const, label: t("onboarding.sendReports") },
		{ value: "dont" as const, label: t("onboarding.dontSend") },
	];
}

type TitleLanguage = (typeof titleLanguageSchema.options)[number];

export function OnboardingWizard() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [step, setStep] = useState(0);
	const settingsQuery = trpc.settings.get.useQuery();
	const statusQuery = trpc.anilist.status.useQuery();
	const utils = trpc.useUtils();
	const setSettings = trpc.settings.set.useMutation({
		onSuccess: (settings) => {
			utils.settings.get.setData(undefined, settings);
		},
	});
	const connected = Boolean(statusQuery.data?.connected);
	const wasConnected = useRef(false);
	const settings = settingsQuery.data;
	const [theme, setTheme] = useTheme();
	const [language, setLanguage] = useState<TitleLanguage | null>(null);
	const [recognition, setRecognition] = useState<boolean | null>(null);
	const [players, setPlayers] = useState<boolean | null>(null);
	const [confirm, setConfirm] = useState<boolean | null>(null);
	const [crashReports, setCrashReports] = useState<boolean | null>(null);
	const progress = ((step + 1) / STEP_COUNT) * 100;

	if (!settings) {
		return null;
	}

	if (statusQuery.isFetched) {
		if (step === 0 && connected && !wasConnected.current) {
			wasConnected.current = true;
			setStep(1);
		} else if (!connected) {
			wasConnected.current = false;
		}
	}

	const titleLanguage = language ?? settings.titleLanguage;
	const enableRecognition = recognition ?? settings.enableRecognition;
	const enableMediaPlayerDetection = players ?? settings.enableMediaPlayerDetection;
	const askToConfirmUpdate = confirm ?? settings.askToConfirmUpdate;
	const sendCrashReports = crashReports ?? settings.sendCrashReports;

	async function goPrefsNext(): Promise<void> {
		await setSettings.mutateAsync({
			titleLanguage,
			enableRecognition,
			enableMediaPlayerDetection,
			askToConfirmUpdate,
		});
		setStep(3);
	}

	async function goCrashReportsNext(): Promise<void> {
		await setSettings.mutateAsync({ sendCrashReports });
		setStep(4);
	}

	async function finish(): Promise<void> {
		await setSettings.mutateAsync({ onboardingComplete: true });
		await navigate({ to: "/app/anime-list" });
	}

	return (
		<div className='flex min-h-0 flex-1 flex-col bg-background'>
			{step === 0 ? null : (
				<header className='border-b'>
					<div className='@container mx-auto flex w-full max-w-xl flex-col gap-2 px-6 py-4'>
						<div className='flex items-center gap-2'>
							<Logo className='size-6' />
							<h1 className='text-base font-medium'>{t("onboarding.getStarted")}</h1>
						</div>
						<p className='text-sm text-muted-foreground'>{t("onboarding.intro")}</p>
						<Progress value={progress}>
							<div className='flex w-full items-center'>
								<ProgressLabel>{t("onboarding.step", { current: step + 1, total: STEP_COUNT })}</ProgressLabel>
								<ProgressValue />
							</div>
						</Progress>
					</div>
				</header>
			)}
			<div className='flex min-h-0 flex-1 flex-col overflow-auto'>
				{step === 0 ? (
					<OnboardingConnectStep />
				) : (
					<div className='@container mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-6'>
						{step === 1 ? <OnboardingLibraryStep /> : null}
						{step === 2 ? (
							<OnboardingPrefsStep
								theme={theme}
								onThemeChange={setTheme}
								titleLanguage={titleLanguage}
								onTitleLanguageChange={setLanguage}
								enableRecognition={enableRecognition}
								onEnableRecognitionChange={setRecognition}
								enableMediaPlayerDetection={enableMediaPlayerDetection}
								onEnableMediaPlayerDetectionChange={setPlayers}
								askToConfirmUpdate={askToConfirmUpdate}
								onAskToConfirmUpdateChange={setConfirm}
							/>
						) : null}
						{step === 3 ? <OnboardingCrashReportsStep sendCrashReports={sendCrashReports} onSendCrashReportsChange={setCrashReports} /> : null}
						{step === 4 ? <OnboardingDoneStep username={statusQuery.data?.username ?? ""} folderCount={settings.libraryFolders.length} /> : null}
					</div>
				)}
			</div>
			{step === 0 ? null : (
				<footer className='border-t'>
					<div className='mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-6 py-3'>
						<Button type='button' variant='ghost' disabled={setSettings.isPending} onClick={() => setStep(step - 1)}>
							<ChevronLeftIcon data-icon='inline-start' />
							{t("common.back")}
						</Button>
						<div className='flex items-center gap-2'>
							{step === 1 ? (
								<Button type='button' variant='ghost' onClick={() => setStep(2)}>
									{t("onboarding.skip")}
								</Button>
							) : null}
							{step === 4 ? (
								<Button type='button' disabled={setSettings.isPending} onClick={() => void finish()}>
									{t("onboarding.openBiyori")}
								</Button>
							) : (
								<Button
									type='button'
									disabled={setSettings.isPending}
									onClick={() => {
										if (step === 2) {
											void goPrefsNext();
											return;
										}
										if (step === 3) {
											void goCrashReportsNext();
											return;
										}
										setStep(step + 1);
									}}>
									{t("onboarding.next")}
								</Button>
							)}
						</div>
					</div>
				</footer>
			)}
		</div>
	);
}

function OnboardingConnectStep() {
	const { t } = useTranslation();
	const statusQuery = trpc.anilist.status.useQuery();
	const authorize = trpc.anilist.authorize.useMutation();
	const disconnect = trpc.anilist.disconnect.useMutation({
		onSuccess: async () => {
			await statusQuery.refetch();
		},
	});
	const connected = Boolean(statusQuery.data?.connected);
	const username = statusQuery.data?.username ?? "";
	const errorMessage = statusQuery.data?.loginError ?? authorize.error?.message ?? disconnect.error?.message ?? null;

	return (
		<div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-8 py-6'>
			<Logo className='size-14' />
			{connected ? (
				<p className='text-center text-sm'>{t("onboarding.connectedAs", { name: username || t("anime.anilist") })}</p>
			) : (
				<p className='text-center text-sm text-muted-foreground'>{t("onboarding.signIn")}</p>
			)}
			<div className='flex w-full max-w-xs flex-col gap-2'>
				{connected ? (
					<Button
						type='button'
						variant='outline'
						size='lg'
						className='w-full justify-start'
						disabled={disconnect.isPending}
						onClick={() => {
							void disconnect.mutateAsync();
						}}>
						<AnilistIcon data-icon='inline-start' />
						{t("onboarding.disconnectAnilist")}
					</Button>
				) : (
					<Button
						type='button'
						size='lg'
						className='w-full justify-start'
						disabled={authorize.isPending}
						onClick={() => {
							void authorize.mutateAsync();
						}}>
						<AnilistIcon data-icon='inline-start' />
						{t("onboarding.continueAnilist")}
					</Button>
				)}
				<Button type='button' variant='outline' size='lg' className='w-full justify-start' disabled>
					<MyAnimeListIcon data-icon='inline-start' />
					{t("anime.myAnimeList")}
					<Badge variant='secondary' size='sm' className='ml-auto'>
						{t("onboarding.soon")}
					</Badge>
				</Button>
				<Button type='button' variant='outline' size='lg' className='w-full justify-start' disabled>
					{t("anime.kitsu")}
					<Badge variant='secondary' size='sm' className='ml-auto'>
						{t("onboarding.soon")}
					</Badge>
				</Button>
			</div>
			{errorMessage ? <p className='max-w-xs text-center text-sm text-destructive'>{errorMessage}</p> : null}
			{connected ? null : <OnboardingPasteToken />}
		</div>
	);
}

function OnboardingPasteToken() {
	const { t } = useTranslation();
	const tokenId = useId();
	const tokenForm = useForm<AnilistTokenInput, unknown, AnilistToken>({
		resolver: zodResolver(anilistTokenSchema),
		defaultValues: { token: "" },
	});
	const statusQuery = trpc.anilist.status.useQuery();
	const connectWithToken = trpc.anilist.connectWithToken.useMutation({
		onSuccess: async () => {
			tokenForm.reset({ token: "" });
			await statusQuery.refetch();
		},
	});
	const errorMessage = connectWithToken.error?.message ?? null;

	return (
		<details className='w-full max-w-xs'>
			<summary className='cursor-pointer text-center text-xs text-muted-foreground'>{t("onboarding.pasteToken")}</summary>
			<FormProvider {...tokenForm}>
				<div className='mt-3 flex flex-col gap-3'>
					<Controller
						control={tokenForm.control}
						name='token'
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid || undefined}>
								<FieldLabel htmlFor={tokenId}>{t("onboarding.accessToken")}</FieldLabel>
								<Textarea
									id={tokenId}
									rows={3}
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
					<OnboardingPasteConnectButton
						onConnect={() => {
							void tokenForm.handleSubmit((data) => {
								void connectWithToken.mutateAsync(data);
							})();
						}}
					/>
					<FieldDescription>{t("onboarding.tokenHint")}</FieldDescription>
					{errorMessage ? <p className='text-sm text-destructive'>{errorMessage}</p> : null}
				</div>
			</FormProvider>
		</details>
	);
}

function OnboardingPasteConnectButton({ onConnect }: { onConnect: () => void }) {
	const { t } = useTranslation();
	const { control } = useFormContext<AnilistTokenInput>();
	const { isSubmitting } = useFormState({ control });
	return (
		<Button type='button' disabled={isSubmitting} onClick={onConnect}>
			{t("onboarding.connect")}
		</Button>
	);
}

function OnboardingLibraryStep() {
	const { t } = useTranslation();
	const settingsQuery = trpc.settings.get.useQuery();
	const utils = trpc.useUtils();
	const addFolder = useAddLibraryFolder();
	const setSettings = trpc.settings.set.useMutation({
		onSuccess: (settings) => {
			utils.settings.get.setData(undefined, settings);
		},
	});
	const folders = settingsQuery.data?.libraryFolders ?? [];

	return (
		<FieldGroup>
			<p className='text-sm text-muted-foreground'>{t("onboarding.libraryHint")}</p>
			{folders.length === 0 ? (
				<Empty className='min-h-32 border border-dashed'>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<FolderIcon />
						</EmptyMedia>
						<EmptyTitle>{t("library.noFolders")}</EmptyTitle>
						<EmptyDescription>{t("library.addFolderHint")}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<ul className='flex flex-col gap-2'>
					{folders.map((folder) => (
						<li key={folder.path} className='flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2'>
							<FolderIcon />
							<div className='min-w-0 flex-1'>
								<p className='truncate font-medium'>{folderDisplayName(folder.path)}</p>
								<p className='truncate text-sm text-muted-foreground'>{folder.path}</p>
							</div>
							<Button
								type='button'
								variant='ghost'
								size='icon-xs'
								aria-label={t("onboarding.removeFolder", { name: folderDisplayName(folder.path) })}
								disabled={setSettings.isPending}
								onClick={() => {
									void setSettings.mutateAsync({
										libraryFolders: folders.filter((item) => item.path !== folder.path),
									});
								}}>
								<Trash2Icon />
							</Button>
						</li>
					))}
				</ul>
			)}
			<Button
				type='button'
				variant='outline'
				disabled={addFolder.isPending}
				onClick={() => {
					void addFolder.addFromPicker();
				}}>
				<FolderPlusIcon data-icon='inline-start' />
				{t("onboarding.addLibraryFolder")}
			</Button>
		</FieldGroup>
	);
}

function OnboardingPrefsStep({
	theme,
	onThemeChange,
	titleLanguage,
	onTitleLanguageChange,
	enableRecognition,
	onEnableRecognitionChange,
	enableMediaPlayerDetection,
	onEnableMediaPlayerDetectionChange,
	askToConfirmUpdate,
	onAskToConfirmUpdateChange,
}: {
	theme: ThemeMode;
	onThemeChange: (next: ThemeMode) => void;
	titleLanguage: TitleLanguage;
	onTitleLanguageChange: (next: TitleLanguage) => void;
	enableRecognition: boolean;
	onEnableRecognitionChange: (next: boolean) => void;
	enableMediaPlayerDetection: boolean;
	onEnableMediaPlayerDetectionChange: (next: boolean) => void;
	askToConfirmUpdate: boolean;
	onAskToConfirmUpdateChange: (next: boolean) => void;
}) {
	const themeId = useId();
	const languageId = useId();
	const recognitionId = useId();
	const playersId = useId();
	const confirmId = useId();
	const { t } = useTranslation();

	return (
		<FieldGroup>
			<Field>
				<FieldLabel htmlFor={themeId}>{t("onboarding.theme")}</FieldLabel>
				<SettingsToggleGroup id={themeId} value={theme} onValueChange={(value) => onThemeChange(value as ThemeMode)} options={themeOptions()} />
			</Field>
			<Field>
				<FieldLabel htmlFor={languageId}>{t("onboarding.titleLanguage")}</FieldLabel>
				<SettingsToggleGroup id={languageId} value={titleLanguage} onValueChange={(value) => onTitleLanguageChange(value as TitleLanguage)} options={titleLanguageOptions()} />
			</Field>
			<PrefCheckbox id={recognitionId} label={t("onboarding.enableRecognition")} checked={enableRecognition} onCheckedChange={onEnableRecognitionChange} />
			<PrefCheckbox id={playersId} label={t("onboarding.detectPlayers")} checked={enableMediaPlayerDetection} onCheckedChange={onEnableMediaPlayerDetectionChange} />
			<PrefCheckbox id={confirmId} label={t("onboarding.askBeforeUpdate")} checked={askToConfirmUpdate} onCheckedChange={onAskToConfirmUpdateChange} />
		</FieldGroup>
	);
}

function OnboardingCrashReportsStep({ sendCrashReports, onSendCrashReportsChange }: { sendCrashReports: boolean; onSendCrashReportsChange: (next: boolean) => void }) {
	const crashReportsId = useId();
	const { t } = useTranslation();
	return (
		<FieldGroup>
			<Field>
				<FieldLabel htmlFor={crashReportsId}>{t("onboarding.crashTitle")}</FieldLabel>
				<FieldDescription>{t("onboarding.crashHelp")}</FieldDescription>
				<SettingsToggleGroup
					id={crashReportsId}
					value={sendCrashReports ? "send" : "dont"}
					onValueChange={(value) => onSendCrashReportsChange(value === "send")}
					options={crashReportOptions()}
				/>
			</Field>
		</FieldGroup>
	);
}

function OnboardingDoneStep({ username, folderCount }: { username: string; folderCount: number }) {
	const { t } = useTranslation();
	const name = username || t("anime.anilist");
	const folders = folderCount > 0 ? t("onboarding.foldersAdded", { count: folderCount }) : t("onboarding.noFoldersYet");
	return (
		<FieldGroup>
			<p className='text-sm'>
				{t("onboarding.connectedAs", { name })}. {folders}
			</p>
			<p className='text-sm text-muted-foreground'>{t("onboarding.changeLater")}</p>
		</FieldGroup>
	);
}

function PrefCheckbox({ id, label, checked, onCheckedChange }: { id: string; label: string; checked: boolean; onCheckedChange: (next: boolean) => void }) {
	return (
		<Field orientation='horizontal'>
			<Checkbox
				id={id}
				checked={checked}
				onCheckedChange={(value) => {
					onCheckedChange(value === true);
				}}
			/>
			<FieldLabel htmlFor={id} className='font-normal'>
				{label}
			</FieldLabel>
		</Field>
	);
}
