import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { type AnilistSearchForm, type AnilistSearchFormInput, anilistSearchFormSchema } from "@/lib/schemas/anilist-search";
import { ListFilterBar } from "@/mainview/components/list-filter-bar";
import { handleSuggestKeyDown, SearchOverlayCard, SearchSuggestPanel, suggestionOptionCount } from "@/mainview/components/search-suggest";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/mainview/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/mainview/components/ui/tooltip";
import { rememberAnilistSearch } from "@/mainview/lib/anilist-search-history";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { appendFilterClauses, parseFilterQuery, serializeFilterQuery } from "@/mainview/lib/anime-list-filter";
import { getListFilterText, setListFilterText, useListFilterResetToken, useListFilterText } from "@/mainview/lib/list-filter";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";

const LIST_FILTER_DEBOUNCE_MS = 250;
const searchPanelClass = "top-[-0.5rem] right-auto left-[calc(100%+0.5rem)] w-80 origin-left";

function routeQuery(search: unknown): string {
	if (search != null && typeof search === "object" && "q" in search && typeof search.q === "string") {
		return search.q;
	}
	return "";
}

export function SidebarSearch() {
	const navigate = useNavigate();
	const animeInfo = useAnimeInfoNav();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const routeQ = useRouterState({
		select: (state) => routeQuery(state.location.search),
	});
	const onSearchPage = pathname === "/app/search";
	const isAnimeListPage = pathname === "/app/anime-list" || pathname === "/app/anime-list/";
	const isSeasonsPage = pathname === "/app/seasons";
	const isLiveFilterPage = isAnimeListPage || isSeasonsPage;
	const form = useForm<AnilistSearchFormInput, unknown, AnilistSearchForm>({
		resolver: zodResolver(anilistSearchFormSchema),
		defaultValues: { q: "" },
	});
	const searchId = useId();
	const listId = `${searchId}-suggest`;
	const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const filterResetToken = useListFilterResetToken();
	const listFilter = useListFilterText();
	const parsedFilter = parseFilterQuery(listFilter);
	const [searchHover, setSearchHover] = useState(false);
	const [searchFocus, setSearchFocus] = useState(false);
	const [filterMenuOpen, setFilterMenuOpen] = useState(false);
	const hasListFilter = parsedFilter.clauses.length > 0;
	const showFilterCard = isLiveFilterPage && (searchFocus || filterMenuOpen || (hasListFilter && searchHover));
	const qValue = form.watch("q");
	const trimmedQ = (typeof qValue === "string" ? qValue : "").trim();
	const canSubmit = trimmedQ.length > 0;
	const suggestReady = !isLiveFilterPage && trimmedQ.length >= 2;
	const [debouncedQ, setDebouncedQ] = useState("");
	const [panelOpen, setPanelOpen] = useState(true);
	const [active, setActive] = useState({ q: "", index: 0 });
	const [previewTitle, setPreviewTitle] = useState<string | null>(null);
	const suggestQuery = trpc.anime.suggest.useQuery({ q: debouncedQ }, { enabled: !isLiveFilterPage && debouncedQ.length >= 2 });
	const tagNamesQuery = trpc.anime.tagNames.useQuery(undefined, { enabled: isLiveFilterPage, staleTime: Number.POSITIVE_INFINITY });
	const tagNames = tagNamesQuery.data ?? [];
	const items = !isLiveFilterPage && debouncedQ === trimmedQ ? (suggestQuery.data ?? []) : [];
	const optionCount = suggestionOptionCount(items);
	const showPanel = suggestReady && panelOpen;
	if (active.q !== debouncedQ) {
		setActive({ q: debouncedQ, index: 0 });
	}
	const activeIndex = active.q === debouncedQ ? active.index : 0;
	const placeholder = isAnimeListPage ? "Filter this list" : isSeasonsPage ? "Filter this season" : "Search AniList";

	function goToAnilistSearch(q: string): void {
		if (!q) {
			return;
		}
		setPanelOpen(false);
		rememberAnilistSearch(q);
		void navigate({
			to: "/app/search",
			search: { q },
		});
	}

	function chooseSuggestion(index: number): void {
		const hit = items[index];
		if (hit) {
			setPanelOpen(false);
			animeInfo.open({ id: hit.id, infoTab: "main" });
			return;
		}
		goToAnilistSearch(trimmedQ);
	}

	useEffect(() => {
		if (filterResetToken === 0) {
			return;
		}
		form.reset({ q: "" });
	}, [filterResetToken, form]);

	useEffect(() => {
		if (!onSearchPage) {
			return;
		}
		const next = routeQ.trim();
		if (form.getValues("q") !== next) {
			form.setValue("q", next);
		}
	}, [onSearchPage, routeQ, form]);

	useEffect(() => {
		if (filterTimer.current) {
			clearTimeout(filterTimer.current);
			filterTimer.current = null;
		}
		if (!isLiveFilterPage) {
			return;
		}
		const trimmed = (typeof qValue === "string" ? qValue : "").trim();
		const fromBox = parseFilterQuery(trimmed);
		if (trimmed.length === 0) {
			const current = parseFilterQuery(getListFilterText());
			setListFilterText(serializeFilterQuery({ freeText: "", clauses: current.clauses }));
			return;
		}
		if (trimmed.length === 1 && fromBox.clauses.length === 0) {
			return;
		}
		filterTimer.current = setTimeout(() => {
			const current = parseFilterQuery(getListFilterText());
			setListFilterText(
				serializeFilterQuery({
					freeText: fromBox.freeText,
					clauses: appendFilterClauses(current.clauses, fromBox.clauses),
				}),
			);
			if (fromBox.clauses.length > 0) {
				form.setValue("q", fromBox.freeText);
			}
		}, LIST_FILTER_DEBOUNCE_MS);
		return () => {
			if (filterTimer.current) {
				clearTimeout(filterTimer.current);
			}
		};
	}, [qValue, isLiveFilterPage, form]);

	useEffect(() => {
		if (isLiveFilterPage || trimmedQ.length < 2) {
			setDebouncedQ("");
			return;
		}
		const timer = setTimeout(() => {
			setDebouncedQ(trimmedQ);
		}, LIST_FILTER_DEBOUNCE_MS);
		return () => {
			clearTimeout(timer);
		};
	}, [trimmedQ, isLiveFilterPage]);

	return (
		<div className='relative flex flex-col gap-1'>
			<form
				onPointerEnter={() => {
					setSearchHover(true);
				}}
				onPointerLeave={() => {
					setSearchHover(false);
				}}
				onFocusCapture={() => {
					setSearchFocus(true);
				}}
				onBlurCapture={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
						setSearchFocus(false);
					}
				}}
				onSubmit={form.handleSubmit((data) => {
					goToAnilistSearch(data.q.trim());
				})}>
				<label className='sr-only' htmlFor={searchId}>
					Search
				</label>
				<Controller
					control={form.control}
					name='q'
					render={({ field }) => (
						<InputGroup>
							<InputGroupInput
								id={searchId}
								placeholder={placeholder}
								name={field.name}
								ref={field.ref}
								role='combobox'
								aria-autocomplete='list'
								aria-expanded={showPanel}
								aria-controls={listId}
								aria-activedescendant={showPanel ? `${listId}-${activeIndex}` : undefined}
								onFocus={() => {
									setPanelOpen(true);
								}}
								onClick={() => {
									setPanelOpen(true);
								}}
								onBlur={() => {
									setPreviewTitle(null);
									field.onBlur();
									setPanelOpen(false);
								}}
								value={previewTitle ?? (typeof field.value === "string" ? field.value : "")}
								onChange={(event) => {
									setPreviewTitle(null);
									setPanelOpen(true);
									field.onChange(event);
								}}
								onKeyDown={(event) => {
									handleSuggestKeyDown({
										event,
										open: showPanel,
										optionCount,
										activeIndex,
										onActiveIndex: (index) => {
											setActive({ q: debouncedQ, index });
											setPreviewTitle(items[index]?.title ?? null);
										},
										onDismiss: () => {
											setPreviewTitle(null);
											setPanelOpen(false);
										},
										onChoose: chooseSuggestion,
									});
								}}
							/>
							<InputGroupAddon align='inline-end'>
								<Tooltip>
									<TooltipTrigger render={<InputGroupButton type='submit' size='icon-xs' aria-label='Search AniList' disabled={!canSubmit} />}>
										<SearchIcon />
									</TooltipTrigger>
									<TooltipContent>Search AniList</TooltipContent>
								</Tooltip>
							</InputGroupAddon>
						</InputGroup>
					)}
				/>
				<AnimatePresence>
					{showFilterCard ? (
						<SearchOverlayCard key='list-filter' className={cn(searchPanelClass, "p-2")}>
							<ListFilterBar
								clauses={parsedFilter.clauses}
								tagNames={tagNames}
								onMenuOpenChange={setFilterMenuOpen}
								onClausesChange={(clauses) => {
									setListFilterText(
										serializeFilterQuery({
											freeText: parsedFilter.freeText,
											clauses,
										}),
									);
								}}
							/>
						</SearchOverlayCard>
					) : null}
					{showPanel ? (
						<SearchSuggestPanel
							key='anilist-suggest'
							listId={listId}
							q={trimmedQ}
							items={items}
							activeIndex={Math.min(activeIndex, optionCount - 1)}
							onActiveIndex={(index) => {
								setPreviewTitle(null);
								setActive({ q: debouncedQ, index });
							}}
							onOpen={(id) => {
								setPanelOpen(false);
								animeInfo.open({ id, infoTab: "main" });
							}}
							className={searchPanelClass}
							onSearchAnilist={() => {
								goToAnilistSearch(trimmedQ);
							}}
						/>
					) : null}
				</AnimatePresence>
			</form>
		</div>
	);
}
