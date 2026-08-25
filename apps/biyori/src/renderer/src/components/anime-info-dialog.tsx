import AniDBIcon from "@/assets/anidb.png";
import AnilistIcon from "@/assets/anilist.svg";
import MyAnimeListIcon from "@/assets/mal.svg";
import { Image } from "@/components/ui/image";
import { desktopRpc } from "@/desktop-rpc";
import {
  type AnimeInfoFormInput,
  type AnimeInfoFormValues,
  animeInfoFormSchema,
} from "@/lib/schemas/anime-list-entry";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { AnimeListAction } from "@/mainview/components/anime-list-action";
import { AnimeSeriesInfo } from "@/mainview/components/anime-series-info";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/mainview/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/mainview/components/ui/input-group";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/mainview/components/ui/select";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mainview/components/ui/tabs";
import { useHeldOpenPayload } from "@/mainview/lib/held-open-payload";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { pickLibraryFolderPath } from "@/mainview/lib/library-folder";
import { getNeighborAnimeId } from "@/mainview/lib/selected-anime";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { listStatusSchema } from "@/shared/list";
import { zodResolver } from "@hookform/resolvers/zod";
import type { inferRouterOutputs } from "@trpc/server";
import { FolderOpen } from "lucide-react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";

const statusOptions = listStatusSchema.options.map((value) => ({
  value,
  label: value,
}));

function posterExternalLinks(
  id: number,
  title: string,
): Array<{ label: string; short: string; url: string, icon?: React.ReactNode }> {
  const q = encodeURIComponent(title);
  return [
    { label: "AniList", short: "AL", url: `https://anilist.co/anime/${id}`, icon: <AnilistIcon className="size-4" /> },
    {
      label: "MyAnimeList",
      short: "MAL",
      url: `https://myanimelist.net/anime.php?q=${q}`,
      icon: <MyAnimeListIcon className="size-4" />,
    },
    {
      label: "AniDB",
      short: "ADB",
      url: `https://anidb.net/anime/?adb.search=${q}`,
      icon: <Image src={AniDBIcon} alt="AniDB" className="size-6" />,
    },
  ];
}

type AnimeDetail = NonNullable<inferRouterOutputs<AppRouter>["anime"]["byId"]>;

function toDateInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

export function AnimeInfoDialog({
  id,
  ensuring = false,
  ensureError,
  infoTab,
  onOpenChange,
  onNavigate,
}: {
  id: number | undefined;
  ensuring?: boolean;
  ensureError?: string;
  infoTab?: "main" | "list";
  onOpenChange: (open: boolean) => void;
  onNavigate?: (id: number) => void;
}) {
  const open = Boolean(id) || ensuring || Boolean(ensureError);
  const { payload: queryId, onOpenChangeComplete: onIdCloseComplete } =
    useHeldOpenPayload(id);
  const { payload: heldInfoTab, onOpenChangeComplete: onTabCloseComplete } =
    useHeldOpenPayload(id || ensuring ? (infoTab ?? "main") : undefined);
  const byIdQuery = trpc.anime.byId.useQuery(
    { id: queryId ?? 0 },
    { enabled: Boolean(queryId) },
  );
  const anime = byIdQuery.data ?? null;
  const loading =
    !anime &&
    (ensuring ||
      (Boolean(queryId) &&
        (byIdQuery.isLoading || byIdQuery.isFetching) &&
        !ensureError));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        onIdCloseComplete(isOpen);
        onTabCloseComplete(isOpen);
      }}
      modal
    >
      <DialogContent
        className="flex h-full max-w-3xl flex-col items-stretch justify-start gap-0 overflow-hidden rounded-none p-0 sm:max-w-3xl"
        onKeyDownCapture={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
            return;
          }
          const target = event.target;
          if (
            target instanceof HTMLElement &&
            target.closest(
              "input, textarea, select, [data-slot=select-content], [contenteditable=true]",
            )
          ) {
            return;
          }
          if (!id || !onNavigate) {
            return;
          }
          const nextId = getNeighborAnimeId(
            id,
            event.key === "ArrowRight" ? 1 : -1,
          );
          if (!nextId) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          onNavigate(nextId);
        }}
      >
        <DialogTitle className="sr-only">
          {anime?.title ?? "Anime Information"}
        </DialogTitle>

        {loading ? <AnimeInfoLoading /> : null}

        {anime && !loading ? (
          <AnimeInfoBody
            key={`${anime.id}-${heldInfoTab ?? "main"}-${anime.onList}`}
            anime={anime}
            infoTab={heldInfoTab ?? "main"}
            readOnly={!anime.onList}
            onClose={() => {
              onOpenChange(false);
            }}
            onAdded={(id) => {
              onNavigate?.(id);
            }}
          />
        ) : null}

        {!anime && !loading ? (
          <DialogFooter className="mt-0 rounded-b-none p-0!">
            {ensureError ? (
              <p className="mr-auto text-sm text-destructive">{ensureError}</p>
            ) : null}
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="button" onClick={() => onOpenChange(false)}>
              OK
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AnimeInfoLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative h-40 w-full shrink-0 bg-muted">
        <Skeleton className="size-full rounded-none" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-popover to-transparent" />
      </div>
      <div className="relative z-10 -mt-14 flex min-h-0 flex-1 gap-4 px-4 pb-4">
        <Skeleton className="aspect-2/3 w-56 shrink-0 self-start rounded-md" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <Skeleton className="mt-auto h-6 w-2/3" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="min-h-0 flex-1 w-full" />
        </div>
      </div>
    </div>
  );
}

function AnimeInfoBody({
  anime,
  infoTab,
  readOnly = false,
  onClose,
  onAdded,
}: {
  anime: AnimeDetail;
  infoTab: "main" | "list";
  readOnly?: boolean;
  onClose: () => void;
  onAdded?: (id: number) => void;
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
  const utils = trpc.useUtils();
  const saveEntry = trpc.anilist.saveEntry.useMutation();
  const setLocal = trpc.anime.setLocal.useMutation();
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
      alternativeTitles: anime.alternativeTitles ?? "",
    },
  });

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative h-40 w-full shrink-0 overflow-hidden bg-muted">
          {anime.bannerUrl ? (
            <AnimeCover
              id={anime.id}
              kind="banner"
              sourceUrl={anime.bannerUrl}
              alt=""
              className="size-full"
            />
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-popover to-transparent" />
        </div>

        <div className="relative z-10 -mt-14 flex min-h-0 flex-1 gap-4 px-4">
          <div className="flex w-56 shrink-0 flex-col gap-2 self-start">
            <div className="aspect-2/3 w-full overflow-hidden rounded-md border bg-muted shadow-md ring-1 ring-foreground/10">
              <AnimeCover
                id={anime.id}
                coverUrl={anime.coverUrl || undefined}
                alt={`Key art for ${anime.title}`}
                width={224}
                height={336}
                className="size-full"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
              {posterExternalLinks(anime.id, anime.title).map((link) => (
                <Button
                  key={link.label}
                  type="button"
                  variant="outline"
                  title={link.label}
                  aria-label={link.label}
                  onClick={() => {
                    void desktopRpc.request.openExternal({ url: link.url });
                  }}
                >
                 {link.icon ? link.icon : <span className="text-[10px] font-semibold">{link.short}</span>}
                </Button>
              ))}
            </div>
            <AnimeListAction
              mediaId={anime.id}
              onList={anime.onList}
              status={anime.status}
              progress={anime.episodesWatched ?? 0}
              notes={anime.notes ?? ""}
              rewatching={Boolean(anime.rewatching)}
              onAdded={onAdded}
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <div className="flex min-h-14 shrink-0 items-end">
              <h2 className="text-balance text-lg font-semibold text-foreground drop-shadow-sm">
                {anime.title}
              </h2>
            </div>
            <Tabs
              defaultValue={infoTab}
              className="flex min-h-0 flex-1 flex-col gap-2"
            >
              <TabsList className="shrink-0">
                <TabsTrigger value="main">Main information</TabsTrigger>
                <TabsTrigger value="list">My list and settings</TabsTrigger>
              </TabsList>
              <TabsContent
                value="main"
                keepMounted={false}
                className="mt-0 flex min-h-0 flex-1 flex-col"
              >
                <ScrollArea className="h-full min-h-0 " viewportClassName=" px-2 pt-2">
                  <AnimeSeriesInfo
                    anime={{
                      ...anime,
                      yourScore: anime.score,
                    }}
                    className="pb-3"
                  />
                </ScrollArea>
              </TabsContent>
              <TabsContent
                value="list"
                keepMounted={false}
                className="mt-0 flex min-h-0 flex-1 flex-col"
              >
                <ScrollArea className="h-full min-h-0" viewportClassName=" px-2 pt-2">
                  {readOnly ? (
                    <div className="flex flex-col gap-3 pb-3">
                      <p className="text-sm text-muted-foreground">
                        Not in your list yet.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 pr-3 pb-3">
                      <FieldSet>
                        <FieldLegend variant="label">Anime list</FieldLegend>
                        <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <Field>
                            <FieldLabel htmlFor={progressId}>
                              Episodes watched:
                            </FieldLabel>
                            <Input
                              id={progressId}
                              type="number"
                              min={0}
                              max={episodeMax}
                              {...form.register("progress", {
                                valueAsNumber: true,
                              })}
                            />
                            <FieldError
                              errors={[form.formState.errors.progress]}
                            />
                          </Field>
                          <Controller
                            control={form.control}
                            name="status"
                            render={({ field, fieldState }) => (
                              <Field
                                data-invalid={fieldState.invalid || undefined}
                              >
                                <FieldLabel htmlFor={statusId}>
                                  Status:
                                </FieldLabel>
                                <Select
                                  value={field.value}
                                  items={Object.fromEntries(
                                    statusOptions.map((option) => [
                                      option.value,
                                      option.label,
                                    ]),
                                  )}
                                  onValueChange={(value) => {
                                    if (typeof value !== "string") {
                                      return;
                                    }
                                    field.onChange(value);
                                    if (
                                      value === "Completed" &&
                                      anime.episodes > 0
                                    ) {
                                      form.setValue("progress", anime.episodes, {
                                        shouldDirty: true,
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger id={statusId} className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      {statusOptions.map((option) => (
                                        <SelectItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />
                          <Field>
                            <FieldLabel htmlFor={rewatchesId}>
                              Times rewatched:
                            </FieldLabel>
                            <Input
                              id={rewatchesId}
                              type="number"
                              min={0}
                              {...form.register("timesRewatched", {
                                valueAsNumber: true,
                              })}
                            />
                            <FieldError
                              errors={[form.formState.errors.timesRewatched]}
                            />
                          </Field>
                          <Controller
                            control={form.control}
                            name="score"
                            render={({ field, fieldState }) => (
                              <Field
                                data-invalid={fieldState.invalid || undefined}
                              >
                                <FieldLabel htmlFor={scoreId}>Score:</FieldLabel>
                                <Input
                                  id={scoreId}
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={
                                    typeof field.value === "number"
                                      ? field.value
                                      : ""
                                  }
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    if (raw === "") {
                                      field.onChange(null);
                                      return;
                                    }
                                    field.onChange(Number(raw));
                                  }}
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />
                          <Controller
                            control={form.control}
                            name="rewatching"
                            render={({ field }) => (
                              <Field orientation="horizontal">
                                <Checkbox
                                  id={rewatchingId}
                                  checked={Boolean(field.value)}
                                  onCheckedChange={(checked) => {
                                    const on = checked === true;
                                    field.onChange(on);
                                    if (on) {
                                      form.setValue(
                                        "status",
                                        "Currently watching",
                                        { shouldDirty: true },
                                      );
                                      if (
                                        parsedStatus.success &&
                                        parsedStatus.data === "Completed" &&
                                        anime.episodes > 0 &&
                                        form.getValues("progress") ===
                                          anime.episodes
                                      ) {
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
                                      form.setValue(
                                        "progress",
                                        anime.episodesWatched ?? 0,
                                        { shouldDirty: true },
                                      );
                                    }
                                  }}
                                />
                                <FieldLabel
                                  htmlFor={rewatchingId}
                                  className="font-normal"
                                >
                                  Rewatching
                                </FieldLabel>
                              </Field>
                            )}
                          />
                          <Field>
                            <FieldLabel htmlFor={notesId}>Notes:</FieldLabel>
                            <Input id={notesId} {...form.register("notes")} />
                            <FieldError
                              errors={[form.formState.errors.notes]}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={startedId}>Started:</FieldLabel>
                            <Input
                              id={startedId}
                              type="date"
                              {...form.register("dateStarted")}
                            />
                            <FieldError
                              errors={[form.formState.errors.dateStarted]}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={completedId}>
                              Finished:
                            </FieldLabel>
                            <Input
                              id={completedId}
                              type="date"
                              {...form.register("dateCompleted")}
                            />
                            <FieldError
                              errors={[form.formState.errors.dateCompleted]}
                            />
                          </Field>
                        </FieldGroup>
                      </FieldSet>
                      <FieldSet>
                        <FieldLegend variant="label">Settings</FieldLegend>
                        <FieldGroup className="gap-3">
                          <Field>
                            <FieldLabel htmlFor={altTitlesId}>
                              Alternative titles:
                            </FieldLabel>
                            <Input
                              id={altTitlesId}
                              placeholder="Title 1; Title 2"
                              {...form.register("alternativeTitles")}
                            />
                            <FieldError
                              errors={[
                                form.formState.errors.alternativeTitles,
                              ]}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={folderId}>Folder:</FieldLabel>
                            <InputGroup>
                              <InputGroupInput
                                id={folderId}
                                {...form.register("folder")}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  size="icon-xs"
                                  aria-label="Browse folder"
                                  onClick={() => {
                                    void pickLibraryFolderPath().then((path) => {
                                      if (!path) {
                                        return;
                                      }
                                      form.setValue("folder", path, {
                                        shouldDirty: true,
                                      });
                                    });
                                  }}
                                >
                                  <FolderOpen />
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                            <FieldError
                              errors={[form.formState.errors.folder]}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={fansubId}>
                              Fansub group preference:
                            </FieldLabel>
                            <Input id={fansubId} {...form.register("fansub")} />
                            <FieldError
                              errors={[form.formState.errors.fansub]}
                            />
                          </Field>
                        </FieldGroup>
                      </FieldSet>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <DialogFooter className="h-16 shrink-0 rounded-b-none">
        {form.formState.errors.root?.serverError ? (
          <FieldError
            errors={[form.formState.errors.root.serverError]}
          />
        ) : null}
        <DialogClose render={<Button variant="ghost" type="button" />} className={"no-drag"}>
          Cancel
        </DialogClose>
        {readOnly ? (
          <Button type="button" onClick={onClose}>
            OK
          </Button>
        ) : (
          <Button
            type="button"
            disabled={
              !form.formState.isDirty ||
              form.formState.isSubmitting ||
              saveEntry.isPending ||
              setLocal.isPending
            }
            onClick={() => {
              void form.handleSubmit(async (data) => {
                try {
                  await saveEntry.mutateAsync({
                    animeId: anime.id,
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
                    id: anime.id,
                    folder: data.folder,
                    fansub: data.fansub,
                    alternativeTitles: data.alternativeTitles,
                  });
                  form.reset(data);
                  onClose();
                  void invalidateAnimeQueries(utils, "entrySaved", anime.id);
                } catch (error) {
                  form.setError("root.serverError", {
                    message:
                      error instanceof Error
                        ? error.message
                        : "Could not save list entry",
                  });
                }
              })();
            }}
          >
            Save changes
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
