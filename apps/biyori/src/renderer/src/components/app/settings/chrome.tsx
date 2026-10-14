import { t } from "@biyori/translations/react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutGroup, motion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SettingsCategoryNav, type SettingsCategoryNavItem } from "@/mainview/components/app/settings/settings-category-nav";
import { SettingsPageCardsHost, type SettingsPageCardsUpdate } from "@/mainview/components/app/settings/settings-page-nav";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { matchSettingsNav, settingsCardElementId, settingsCardFromViewport, settingsSectionHref, settingsSections } from "@/mainview/lib/settings-nav";
import { cn } from "@/mainview/lib/utils";

function sectionCopy(id: string): { label: string; description: string } {
	switch (id) {
		case "services":
			return { label: t("settings.nav.services.label"), description: t("settings.nav.services.description") };
		case "library":
			return { label: t("settings.nav.library.label"), description: t("settings.nav.library.description") };
		case "application":
			return { label: t("settings.nav.application.label"), description: t("settings.nav.application.description") };
		case "recognition":
			return { label: t("settings.nav.recognition.label"), description: t("settings.nav.recognition.description") };
		case "sharing":
			return { label: t("settings.nav.sharing.label"), description: t("settings.nav.sharing.description") };
		case "torrents":
			return { label: t("settings.nav.torrents.label"), description: t("settings.nav.torrents.description") };
		case "advanced":
			return { label: t("settings.nav.advanced.label"), description: t("settings.nav.advanced.description") };
		default:
			return { label: id, description: "" };
	}
}

function childCopy(sectionId: string, childId: string): { label: string; description: string } {
	if (sectionId === "recognition" && childId === "general") {
		return { label: t("settings.nav.recognition.general.label"), description: t("settings.nav.recognition.general.description") };
	}
	if (sectionId === "recognition" && childId === "sources") {
		return { label: t("settings.nav.recognition.sources.label"), description: t("settings.nav.recognition.sources.description") };
	}
	if (sectionId === "torrents" && childId === "general") {
		return { label: t("settings.nav.torrents.general.label"), description: t("settings.nav.torrents.general.description") };
	}
	if (sectionId === "torrents" && childId === "filters") {
		return { label: t("settings.nav.torrents.filters.label"), description: t("settings.nav.torrents.filters.description") };
	}
	if (sectionId === "advanced" && childId === "general") {
		return { label: t("settings.nav.advanced.general.label"), description: t("settings.nav.advanced.general.description") };
	}
	if (sectionId === "advanced" && childId === "cache") {
		return { label: t("settings.nav.advanced.cache.label"), description: t("settings.nav.advanced.cache.description") };
	}
	return { label: childId, description: "" };
}

export function navLinkClass(isActive: boolean) {
	return cn(
		"flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
		isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-muted",
	);
}

export function subNavLinkClass(isActive: boolean) {
	return cn("relative flex items-center py-1.5 pl-3 text-left text-sm transition-colors", isActive ? "text-foreground" : "text-foreground/80 hover:text-foreground");
}

const subNavPillSpring = { type: "spring", stiffness: 420, damping: 32 } as const;
const subNavPillEnter = { duration: 0.18, ease: [0.16, 1, 0.3, 1] } as const;
const subNavPillInstant = { duration: 0 } as const;

export function SettingsSubNav({ sectionId, items, pathname }: { sectionId: string; items: readonly { id: string }[]; pathname: string }) {
	const groupActive = items.some((child) => pathname === settingsSectionHref(sectionId, child.id));
	const shown = useRef(false);
	if (!groupActive) {
		shown.current = false;
	}
	const isEnter = groupActive && !shown.current;
	if (groupActive) {
		shown.current = true;
	}

	return (
		<LayoutGroup id={`settings-sub-${sectionId}`}>
			<div className='relative ml-3 flex flex-col border-l border-border'>
				{items.map((child) => {
					const href = settingsSectionHref(sectionId, child.id);
					const isActive = pathname === href;
					return (
						<Link key={child.id} to={href} aria-current={isActive ? "page" : undefined} className={subNavLinkClass(isActive)}>
							{isActive ? (
								<motion.span
									layoutId='pill'
									aria-hidden
									className='absolute top-1/2 left-0 h-3.5 w-1 rounded-full bg-primary'
									initial={isEnter ? { opacity: 0, scale: 0.5, x: "-50%", y: "-50%" } : false}
									animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
									transition={{
										layout: subNavPillSpring,
										opacity: isEnter ? subNavPillEnter : subNavPillInstant,
										scale: isEnter ? subNavPillEnter : subNavPillInstant,
									}}
								/>
							) : null}
							<span className='truncate'>{childCopy(sectionId, child.id).label}</span>
						</Link>
					);
				})}
			</div>
		</LayoutGroup>
	);
}

export function SettingsChrome({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const cardSearch = useRouterState({
		select: (state) => {
			const card = (state.location.search as { card?: unknown }).card;
			return typeof card === "string" ? card : "";
		},
	});
	const navigate = useNavigate();
	const { section: active, child: activeChild } = matchSettingsNav(pathname);
	const heading = activeChild && active ? childCopy(active.id, activeChild.id) : active ? sectionCopy(active.id) : undefined;
	const pathRef = useRef(pathname);
	pathRef.current = pathname;
	const [pageCards, setPageCards] = useState<{ path: string; items: SettingsCategoryNavItem[] } | null>(null);
	if (pageCards && pageCards.path !== pathname) {
		setPageCards(null);
	}
	const cards = pageCards?.path === pathname ? pageCards.items : null;
	const cardFromSearch = cards?.some((item) => item.id === cardSearch) ? cardSearch : (cards?.[0]?.id ?? "");
	const [spyPath, setSpyPath] = useState(pathname);
	const [spyCard, setSpyCard] = useState("");
	if (spyPath !== pathname) {
		setSpyPath(pathname);
		setSpyCard("");
	}
	const activeCard = spyCard || cardFromSearch;
	const cardsRef = useRef<HTMLDivElement>(null);

	const applyPageCards = useCallback((update: SettingsPageCardsUpdate) => {
		if (update.path !== pathRef.current) {
			return;
		}
		setPageCards(update.items ? { path: update.path, items: update.items } : null);
	}, []);

	useLayoutEffect(() => {
		if (!cardSearch) {
			return;
		}
		document.getElementById(settingsCardElementId(cardSearch))?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, [cardSearch]);

	useEffect(() => {
		const ids = cards?.map((item) => item.id);
		if (!ids?.length) {
			setSpyCard("");
			return;
		}
		const root = cardsRef.current?.closest("[data-slot='scroll-area-viewport']");
		if (!(root instanceof HTMLElement)) {
			return;
		}
		const onScroll = () => {
			const next = settingsCardFromViewport(ids, root, 52);
			setSpyCard((prev) => (prev === next ? prev : next));
		};
		onScroll();
		root.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			root.removeEventListener("scroll", onScroll);
		};
	}, [cards]);

	return (
		<SettingsPageCardsHost setCards={applyPageCards}>
			<div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground'>
				<div className='flex min-h-0 flex-1 gap-0 overflow-hidden'>
					<ScrollArea className='h-full w-48 shrink-0 bg-card/20 border-r'>
						<nav aria-label={t("settings.nav.sections")} className='flex flex-col gap-1 p-2'>
							{settingsSections.map((item) => {
								const children = "children" in item ? item.children : undefined;
								if (children?.length) {
									const firstHref = settingsSectionHref(item.id, children[0].id);
									const groupActive = active?.id === item.id;
									return (
										<div key={item.id} className='flex flex-col gap-0.5'>
											<Link to={firstHref} className={navLinkClass(groupActive)}>
												<item.icon className='size-4 shrink-0' />
												<span className='truncate'>{sectionCopy(item.id).label}</span>
											</Link>
											<SettingsSubNav sectionId={item.id} items={children} pathname={pathname} />
										</div>
									);
								}
								const href = settingsSectionHref(item.id);
								const isActive = pathname === href;
								return (
									<Link key={item.id} to={href} aria-current={isActive ? "page" : undefined} className={navLinkClass(isActive)}>
										<item.icon className='size-4 shrink-0' />
										<span className='truncate'>{sectionCopy(item.id).label}</span>
									</Link>
								);
							})}
						</nav>
					</ScrollArea>
					<div className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/30'>
						<ScrollArea className='min-h-0 flex-1' viewportClassName='rounded-none pb-20'>
							<div className='sticky top-0 z-10 border-b bg-card/80 px-2 py-1 backdrop-blur-md'>
								{cards?.length ? (
									<SettingsCategoryNav
										key={pathname}
										layoutId='settings-category-nav'
										aria-label={heading?.label ?? t("settings.nav.title")}
										items={cards}
										value={activeCard}
										onValueChange={(id) => {
											void navigate({
												href: `${pathname}?card=${encodeURIComponent(id)}`,
												replace: true,
											});
										}}
									/>
								) : (
									<div className='flex flex-col gap-0.5 px-2 py-2'>
										<h2 className='text-lg font-semibold tracking-tight'>{heading?.label ?? t("settings.nav.title")}</h2>
										{heading?.description ? <p className='text-sm text-muted-foreground'>{heading.description}</p> : null}
									</div>
								)}
							</div>
							<div ref={cardsRef} className='flex flex-col gap-4 p-4'>
								{children}
							</div>
						</ScrollArea>
						{overlay}
					</div>
				</div>
			</div>
		</SettingsPageCardsHost>
	);
}
