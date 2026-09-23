import { zodResolver } from "@hookform/resolvers/zod";
import type { inferRouterOutputs } from "@trpc/server";
import { CircleAlertIcon, FolderOpen, PlusIcon, XIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useId, useState } from "react";
import { Controller, FormProvider, useForm, useFormContext, useFormState } from "react-hook-form";
import AniDBIcon from "@/assets/anidb.png";
import AnilistIcon from "@/assets/anilist.svg?react";
import MyAnimeListIcon from "@/assets/mal.svg?react";
import { Image } from "@/components/ui/image";
import { desktopRpc } from "@/desktop-rpc";
import { titleStrings } from "@/lib/anime-titles";
import { type AnimeInfoFormInput, type AnimeInfoFormValues, animeInfoFormSchema } from "@/lib/schemas/anime-list-entry";
import { joinTitleList, splitTitleList } from "@/lib/split-title-list";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { AnimeInfoBackHistory } from "@/mainview/components/anime-info-back-history";
import { AnimeInfoSheetPeek } from "@/mainview/components/anime-info-sheet-peek";
import { AnimeListAction, AnimeListStatusSelect } from "@/mainview/components/anime-list-action";
import { AnimeSeriesInfo } from "@/mainview/components/anime-series-info";
import { AnimeStatusNotice } from "@/mainview/components/anime-status-notice";
import { RelatedMediaSection } from "@/mainview/components/related-media-card";
import { SaveBar } from "@/mainview/components/save-bar";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from "@/mainview/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/mainview/components/ui/input-group";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Separator } from "@/mainview/components/ui/separator";
import { Spinner } from "@/mainview/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mainview/components/ui/tabs";
import { Textarea } from "@/mainview/components/ui/textarea";
import { type AnimeInfoFrame, visibleAnimeInfoSheets } from "@/mainview/lib/anime-info-stack";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { pickLibraryFolderPath } from "@/mainview/lib/library-folder";
import { getNeighborAnimeId } from "@/mainview/lib/selected-anime";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { type ListStatus, listStatusSchema } from "@/shared/list";

function posterExternalLinks(id: number, title: string): Array<{ label: string; short: string; url: string; icon?: React.ReactNode }> {
	const q = encodeURIComponent(title);
	return [
		{ label: "AniList", short: "AL", url: `https://anilist.co/anime/${id}`, icon: <AnilistIcon className='size-4' /> },
		{
			label: "MyAnimeList",
			short: "MAL",
			url: `https://myanimelist.net/anime.php?q=${q}`,
			icon: <MyAnimeListIcon className='size-4' />,
		},
		{
			label: "AniDB",
			short: "ADB",
			url: `https://anidb.net/anime/?adb.search=${q}`,
			icon: <Image src={AniDBIcon} alt='AniDB' className='size-6' />,
		},
	];
}

type AnimeDetail = NonNullable<inferRouterOutputs<AppRouter>["anime"]["byId"]>;
const EMPTY_HISTORY: AnimeInfoFrame[] = [];

function toDateInput(value: string | null | undefined): string {
	if (!value) {
		return "";
	}
	return value.slice(0, 10);
}

export function AnimeInfoDialog({
	open,
	anime,
	ensureError,
	infoTab,
	onOpenChange,
	onOpenChangeComplete,
	onNavigate,
	onBackTo,
	history = EMPTY_HISTORY,
}: {
	open: boolean;
	anime: AnimeDetail | null;
	ensureError?: string;
	infoTab?: "main" | "list";
	onOpenChange: (open: boolean) => void;
	onOpenChangeComplete?: (open: boolean) => void;
	onNavigate?: (id: number) => void;
	onBackTo?: (index: number) => void;
	history?: AnimeInfoFrame[];
}) {
	const currentFrame: AnimeInfoFrame | undefined = anime
		? {
				id: anime.id,
				infoTab: infoTab ?? "main",
				title: anime.title,
				coverUrl: anime.coverUrl,
				season: anime.season,
			}
		: undefined;
	const peeks = visibleAnimeInfoSheets(history, currentFrame).slice(0, -1);
	return (
		<Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete} modal>
			<DialogContent
				from='bottom'
				showCloseButton={false}
				className='flex max-w-3xl flex-col items-stretch justify-start gap-0 overflow-hidden rounded-b-none p-0 sm:max-w-4xl'
				underlay={
					<div className='pointer-events-none fixed top-8 right-0 bottom-0 left-0 z-50 mx-auto w-full max-w-3xl sm:max-w-4xl'>
						<AnimatePresence>
							{peeks.map((frame, index) => (
								<AnimeInfoSheetPeek key={frame.id} frame={frame} depth={(2 - peeks.length + index) as 0 | 1} />
							))}
						</AnimatePresence>
					</div>
				}
				onKeyDownCapture={(event) => {
					if (event.key === "Escape" && history.length > 0 && onBackTo) {
						event.preventDefault();
						event.stopPropagation();
						onBackTo(history.length - 1);
						return;
					}
					if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
						return;
					}
					const target = event.target;
					if (target instanceof HTMLElement && target.closest("input, textarea, select, [data-slot=select-content], [contenteditable=true]")) {
						return;
					}
					if (!anime || !onNavigate) {
						return;
					}
					const nextId = getNeighborAnimeId(anime.id, event.key === "ArrowRight" ? 1 : -1);
					if (!nextId) {
						return;
					}
					event.preventDefault();
					event.stopPropagation();
					onNavigate(nextId);
				}}>
				<DialogTitle className='sr-only'>{anime?.title ?? "Anime Information"}</DialogTitle>
				{anime ? (
					<AnimeInfoBody
						key={anime.id}
						anime={anime}
						infoTab={infoTab ?? "main"}
						readOnly={!anime.onList}
						history={history}
						onBackTo={onBackTo}
						onClose={() => {
							onOpenChange(false);
						}}
						onAdded={(id) => {
							onNavigate?.(id);
						}}
					/>
				) : null}

				{!anime ? (
					<DialogFooter className='mt-0 rounded-b-none p-0!'>
						{ensureError ? <p className='mr-auto text-sm text-destructive'>{ensureError}</p> : null}
						<DialogClose render={<Button variant='outline' />}>Cancel</DialogClose>
						<Button type='button' onClick={() => onOpenChange(false)}>
							OK
						</Button>
					</DialogFooter>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function ListEditRow({
	label,
	htmlFor,
	align = "center",
	invalid,
	errors,
	children,
}: {
	label: string;
	htmlFor?: string;
	align?: "center" | "start";
	invalid?: boolean;
	errors?: Array<{ message?: string } | undefined>;
	children: React.ReactNode;
}) {
	return (
		<Field
			orientation='horizontal'
			data-invalid={invalid || undefined}
			className={cn("grid grid-cols-[8.25rem_minmax(0,1fr)] gap-x-3 gap-y-1", align === "start" ? "items-start" : "items-center")}>
			<FieldLabel htmlFor={htmlFor} className={cn("font-normal text-muted-foreground", align === "start" && "pt-2")}>
				{label}
			</FieldLabel>
			<div className='min-w-0'>{children}</div>
			<FieldError className='col-start-2' errors={errors} />
		</Field>
	);
}

function AnimeInfoBody({
	anime,
	infoTab,
	readOnly = false,
	onClose,
	onAdded,
	onBackTo,
	history,
}: {
	anime: AnimeDetail;
	infoTab: "main" | "list";
	readOnly?: boolean;
	onClose: () => void;
	onAdded?: (id: number) => void;
	onBackTo?: (index: number) => void;
	history: AnimeInfoFrame[];
}) {
	const progressId = useId();
	const rewatchesId = useId();
	const statusId = useId();
	const scoreId = useId();
	const notesId = useId();
	const rewatchingId = useId();
	const startedId = useId();
	const completedId = useId();
	const altTitlesId = useId();
	const folderId = useId();
	const fansubId = useId();
	const parsedStatus = listStatusSchema.safeParse(anime.status);
	const episodeMax = anime.episodes > 0 ? anime.episodes : 9999;
	const form = useForm<AnimeInfoFormInput, unknown, AnimeInfoFormValues>({
		resolver: zodResolver(animeInfoFormSchema),
		defaultValues: {
			status: parsedStatus.success ? parsedStatus.data : "Plan to watch",
			progress: anime.episodesWatched ?? 0,
			notes: anime.notes ?? "",
			rewatching: Boolean(anime.rewatching),
			score: anime.score && anime.score > 0 ? anime.score : null,
			timesRewatched: anime.timesRewatched ?? 0,
			dateStarted: toDateInput(anime.dateStarted),
			dateCompleted: toDateInput(anime.dateCompleted),
			folder: anime.folder ?? "",
			fansub: anime.fansub ?? "",
			userSynonyms: anime.userSynonyms ?? "",
		},
	});
	const setListStatus = (onChange: (value: ListStatus) => void, value: ListStatus) => {
		onChange(value);
		if (value === "Completed" && anime.episodes > 0) {
			form.setValue("progress", anime.episodes, { shouldDirty: true });
		}
	};

	return (
		<FormProvider {...form}>
			<div className='flex min-h-0 flex-1 flex-col'>
				<div className='relative h-40 w-full shrink-0 bg-muted'>
					<div className='absolute inset-0 overflow-hidden'>
						{anime.bannerUrl ? <AnimeCover id={anime.id} kind='banner' sourceUrl={anime.bannerUrl} alt='' className='size-full' /> : null}
						<div className='pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-popover to-transparent' />
					</div>
					{history.length > 0 && onBackTo ? <AnimeInfoBackHistory history={history} onBackTo={onBackTo} /> : null}
				</div>

				<div className='relative z-10 -mt-14 flex min-h-0 flex-1 gap-4 px-4'>
					<div className='flex w-56 shrink-0 flex-col gap-2 self-start'>
						<div className='aspect-2/3 w-full overflow-hidden rounded-md border bg-muted shadow-md ring-1 ring-foreground/10'>
							<AnimeCover id={anime.id} coverUrl={anime.coverUrl || undefined} alt={`Key art for ${anime.title}`} width={224} height={336} className='size-full' />
						</div>
						<div className='grid grid-cols-2 md:grid-cols-3 gap-1'>
							{posterExternalLinks(anime.id, anime.title).map((link) => (
								<Button
									key={link.label}
									type='button'
									variant='outline'
									title={link.label}
									aria-label={link.label}
									onClick={() => {
										void desktopRpc.request.openExternal({ url: link.url });
									}}>
									{link.icon ? link.icon : <span className='text-[10px] font-semibold'>{link.short}</span>}
								</Button>
							))}
						</div>
						{readOnly ? (
							<AnimeListAction mediaId={anime.id} onAdded={onAdded} />
						) : (
							<Controller
								control={form.control}
								name='status'
								render={({ field }) => (
									<AnimeListStatusSelect
										value={field.value}
										aria-label='List status'
										onValueChange={(value) => {
											setListStatus(field.onChange, value);
										}}
									/>
								)}
							/>
						)}
						<AnimeStatusNotice
							anime={{
								airingStatus: anime.airingStatus,
								lastAiredEpisode: anime.lastAiredEpisode,
								nextAiringAt: anime.nextAiringAt,
								endDate: anime.endDate,
								ratedRank: anime.ratedRank,
								popularRank: anime.popularRank,
							}}
						/>
					</div>
					<div className='flex min-h-0 min-w-0 flex-1 flex-col gap-2'>
						<div className='flex min-h-14 shrink-0 items-end'>
							<h2 className='cursor-text text-balance text-lg font-semibold text-foreground select-text drop-shadow-sm'>{anime.title}</h2>
						</div>
						<Tabs defaultValue={infoTab} className='flex min-h-0 flex-1 flex-col gap-2'>
							<TabsList className='shrink-0' variant='line'>
								<TabsTrigger value='main'>Main information</TabsTrigger>
								<TabsTrigger value='list'>My list and settings</TabsTrigger>
							</TabsList>
							<TabsContent value='main' keepMounted={false} className='mt-0 flex min-h-0 flex-1 flex-col'>
								<ScrollArea className='h-full min-h-0 ' viewportClassName=' px-2 pt-2'>
									<AnimeSeriesInfo
										anime={{
											...anime,
											yourScore: anime.score,
										}}
										className='pb-3'
									/>
									<RelatedMediaSection items={anime.related} from={{ title: anime.title, coverUrl: anime.coverUrl, season: anime.season }} />
								</ScrollArea>
							</TabsContent>
							<TabsContent value='list' keepMounted={false} className='mt-0 flex min-h-0 flex-1 flex-col'>
								<ScrollArea className='h-full min-h-0' viewportClassName='px-2 pt-2 pb-16'>
									{readOnly ? (
										<div className='flex flex-col gap-3 pb-3'>
											<p className='text-sm text-muted-foreground'>Not in your list yet.</p>
										</div>
									) : (
										<div className='flex flex-col gap-3 pr-3 pb-3'>
											<Controller
												control={form.control}
												name='status'
												render={({ field, fieldState }) => (
													<ListEditRow label='Status' htmlFor={statusId} invalid={fieldState.invalid} errors={[fieldState.error]}>
														<AnimeListStatusSelect
															id={statusId}
															value={field.value}
															onValueChange={(value) => {
																setListStatus(field.onChange, value);
															}}
														/>
													</ListEditRow>
												)}
											/>
											<ListEditRow label='Episodes watched' htmlFor={progressId} errors={[form.formState.errors.progress]}>
												<div className='flex items-center gap-2'>
													<Input
														id={progressId}
														className='w-20'
														type='number'
														min={0}
														max={episodeMax}
														{...form.register("progress", {
															valueAsNumber: true,
														})}
													/>
													{anime.episodes > 0 ? <span className='text-xs whitespace-nowrap text-muted-foreground'>of {anime.episodes}</span> : null}
												</div>
											</ListEditRow>
											<Controller
												control={form.control}
												name='score'
												render={({ field, fieldState }) => (
													<ListEditRow label='Score' htmlFor={scoreId} invalid={fieldState.invalid} errors={[fieldState.error]}>
														<div className='flex items-center gap-2'>
															<input
																type='range'
																min={0}
																max={100}
																step={1}
																value={typeof field.value === "number" ? field.value : 0}
																aria-label='Score'
																className='min-w-0 flex-1 accent-primary'
																onChange={(event) => {
																	const next = Number(event.target.value);
																	field.onChange(next > 0 ? next : null);
																}}
															/>
															<Input
																id={scoreId}
																className='w-20'
																type='number'
																min={0}
																max={100}
																value={typeof field.value === "number" ? field.value : ""}
																onChange={(event) => {
																	const raw = event.target.value;
																	if (raw === "") {
																		field.onChange(null);
																		return;
																	}
																	field.onChange(Number(raw));
																}}
															/>
														</div>
													</ListEditRow>
												)}
											/>
											<Controller
												control={form.control}
												name='rewatching'
												render={({ field }) => (
													<ListEditRow label='Rewatching' htmlFor={rewatchingId}>
														<Checkbox
															id={rewatchingId}
															checked={Boolean(field.value)}
															onCheckedChange={(checked) => {
																const on = checked === true;
																field.onChange(on);
																if (on) {
																	form.setValue("status", "Currently watching", { shouldDirty: true });
																	if (parsedStatus.success && parsedStatus.data === "Completed" && anime.episodes > 0 && form.getValues("progress") === anime.episodes) {
																		form.setValue("progress", 0, {
																			shouldDirty: true,
																		});
																	}
																	return;
																}
																if (parsedStatus.success) {
																	form.setValue("status", parsedStatus.data, {
																		shouldDirty: true,
																	});
																}
																if (form.getValues("progress") === 0) {
																	form.setValue("progress", anime.episodesWatched ?? 0, { shouldDirty: true });
																}
															}}
														/>
													</ListEditRow>
												)}
											/>
											<ListEditRow label='Times rewatched' htmlFor={rewatchesId} errors={[form.formState.errors.timesRewatched]}>
												<Input
													id={rewatchesId}
													className='w-20'
													type='number'
													min={0}
													{...form.register("timesRewatched", {
														valueAsNumber: true,
													})}
												/>
											</ListEditRow>
											<ListEditRow label='Started' htmlFor={startedId} errors={[form.formState.errors.dateStarted]}>
												<Input id={startedId} type='date' {...form.register("dateStarted")} />
											</ListEditRow>
											<ListEditRow label='Finished' htmlFor={completedId} errors={[form.formState.errors.dateCompleted]}>
												<Input id={completedId} type='date' {...form.register("dateCompleted")} />
											</ListEditRow>
											<ListEditRow label='Notes' htmlFor={notesId} align='start' errors={[form.formState.errors.notes]}>
												<Textarea id={notesId} {...form.register("notes")} />
											</ListEditRow>
											<Separator className='my-1' />
											<Controller
												name='userSynonyms'
												control={form.control}
												render={({ field, fieldState }) => (
													<ListEditRow label='Alternative titles' htmlFor={altTitlesId} align='start' invalid={fieldState.invalid}>
														<UserSynonymsField
															id={altTitlesId}
															defaultTitles={titleStrings(anime.titles).filter((title) => title.toLowerCase() !== anime.title.toLowerCase())}
															value={field.value}
															onChange={field.onChange}
															error={fieldState.error}
														/>
													</ListEditRow>
												)}
											/>
											<ListEditRow label='Folder' htmlFor={folderId} errors={[form.formState.errors.folder]}>
												<InputGroup>
													<InputGroupInput id={folderId} {...form.register("folder")} />
													<InputGroupAddon align='inline-end'>
														<InputGroupButton
															size='icon-xs'
															aria-label='Browse folder'
															onClick={() => {
																void pickLibraryFolderPath().then((path) => {
																	if (!path) {
																		return;
																	}
																	form.setValue("folder", path, {
																		shouldDirty: true,
																	});
																});
															}}>
															<FolderOpen />
														</InputGroupButton>
													</InputGroupAddon>
												</InputGroup>
											</ListEditRow>
											<ListEditRow label='Fansub group' htmlFor={fansubId} errors={[form.formState.errors.fansub]}>
												<Input id={fansubId} {...form.register("fansub")} />
											</ListEditRow>
										</div>
									)}
								</ScrollArea>
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</div>
			{readOnly ? (
				<DialogFooter className='h-16 shrink-0 rounded-b-none'>
					<DialogClose render={<Button variant='ghost' type='button' />} className='no-drag'>
						Cancel
					</DialogClose>
					<Button type='button' onClick={onClose}>
						OK
					</Button>
				</DialogFooter>
			) : (
				<AnimeInfoSaveBar animeId={anime.id} />
			)}
		</FormProvider>
	);
}

function UserSynonymsField({
	id,
	defaultTitles,
	value,
	onChange,
	error,
}: {
	id: string;
	defaultTitles: string[];
	value: string;
	onChange: (next: string) => void;
	error?: { message?: string };
}) {
	const [draft, setDraft] = useState("");
	const userTitles = splitTitleList(value);
	const blocked = new Set([...defaultTitles, ...userTitles].map((title) => title.toLowerCase()));

	const addDraft = () => {
		const title = draft.trim();
		setDraft("");
		if (!title || blocked.has(title.toLowerCase())) {
			return;
		}
		onChange(joinTitleList([...userTitles, title]));
	};

	return (
		<div className='flex flex-col gap-2'>
			{defaultTitles.length > 0 ? (
				<div className='flex flex-wrap gap-1'>
					{defaultTitles.map((title) => (
						<Badge key={title} variant='secondary' className='h-auto max-w-full whitespace-normal select-text'>
							{title}
						</Badge>
					))}
				</div>
			) : null}
			{userTitles.length > 0 ? (
				<div className='flex flex-wrap gap-1'>
					{userTitles.map((title) => (
						<Badge key={title} variant='outline' className='h-auto max-w-full pr-0.5 whitespace-normal select-text'>
							{title}
							<Button
								type='button'
								variant='ghost'
								size='icon-xs'
								className='rounded-full'
								aria-label={`Remove ${title}`}
								onClick={() => {
									onChange(joinTitleList(userTitles.filter((item) => item !== title)));
								}}>
								<XIcon />
							</Button>
						</Badge>
					))}
				</div>
			) : null}
			<InputGroup>
				<InputGroupInput
					id={id}
					value={draft}
					placeholder='Add a matching title'
					onChange={(event) => {
						setDraft(event.target.value);
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							addDraft();
						}
					}}
				/>
				<InputGroupAddon align='inline-end'>
					<InputGroupButton size='icon-xs' aria-label='Add alternative title' onClick={addDraft}>
						<PlusIcon />
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
			<FieldDescription>Add titles used to match files. Service titles cannot be edited or removed.</FieldDescription>
			<FieldError errors={[error]} />
		</div>
	);
}

function AnimeInfoSaveBar({ animeId }: { animeId: number }) {
	const form = useFormContext<AnimeInfoFormInput, unknown, AnimeInfoFormValues>();
	const { isDirty, isSubmitting, errors, dirtyFields } = useFormState({
		control: form.control,
	});
	const utils = trpc.useUtils();
	const saveEntry = trpc.anilist.saveEntry.useMutation();
	const setLocal = trpc.anime.setLocal.useMutation();
	const changeCount = Object.keys(dirtyFields).length;
	const serverError = errors.root?.serverError;
	const pending = isSubmitting || saveEntry.isPending || setLocal.isPending;
	const open = isDirty || Boolean(serverError) || pending;

	return (
		<SaveBar open={open} variant='docked' className='mx-4'>
			<Badge variant={serverError ? "destructive" : "secondary"} className='shrink-0'>
				<CircleAlertIcon data-icon='inline-start' />
				{changeCount}
			</Badge>
			<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<p className='truncate text-sm font-medium'>{serverError ? "Could not save" : changeCount === 1 ? "1 unsaved change" : `${changeCount} unsaved changes`}</p>
				<FieldError errors={[serverError]} />
			</div>
			<div className='flex shrink-0 items-center gap-2'>
				<Button
					variant='ghost'
					type='button'
					disabled={pending}
					onClick={() => {
						form.clearErrors("root.serverError");
						form.reset();
					}}>
					Discard
				</Button>
				<Button
					type='button'
					disabled={pending || !isDirty}
					onClick={() => {
						void form.handleSubmit(async (data) => {
							try {
								await saveEntry.mutateAsync({
									animeId,
									status: data.status,
									progress: data.progress,
									notes: data.notes,
									rewatching: data.rewatching,
									score: data.score ?? null,
									timesRewatched: data.timesRewatched,
									dateStarted: data.dateStarted,
									dateCompleted: data.dateCompleted,
								});
								await setLocal.mutateAsync({
									id: animeId,
									folder: data.folder,
									fansub: data.fansub,
									userSynonyms: data.userSynonyms,
								});
								form.reset(data);
								void invalidateAnimeQueries(utils, "entrySaved", animeId);
							} catch (error) {
								form.setError("root.serverError", {
									message: error instanceof Error ? error.message : "Could not save list entry",
								});
							}
						})();
					}}>
					{pending ? <Spinner data-icon='inline-start' /> : null}
					Save
				</Button>
			</div>
		</SaveBar>
	);
}
