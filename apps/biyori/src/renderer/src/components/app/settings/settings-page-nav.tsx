import { useRouterState } from "@tanstack/react-router";
import { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from "react";
import type { SettingsCategoryNavItem } from "@/mainview/components/app/settings/settings-category-nav";

type CardsBag = { current: SettingsCategoryNavItem[] };

export type SettingsPageCardsUpdate = {
	path: string;
	items: SettingsCategoryNavItem[] | null;
};

const CardsBagContext = createContext<CardsBag | null>(null);
const SetPageCardsContext = createContext<(update: SettingsPageCardsUpdate) => void>(() => {});

export function SettingsPageCardsHost({ setCards, children }: { setCards: (update: SettingsPageCardsUpdate) => void; children: ReactNode }) {
	return <SetPageCardsContext.Provider value={setCards}>{children}</SetPageCardsContext.Provider>;
}

export function SettingsPageNav({ children }: { children: ReactNode }) {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const bag = useRef<SettingsCategoryNavItem[]>([]);
	bag.current = [];
	return (
		<CardsBagContext.Provider value={bag}>
			{children}
			<SettingsPageNavCommit bag={bag} path={pathname} />
		</CardsBagContext.Provider>
	);
}

function SettingsPageNavCommit({ bag, path }: { bag: CardsBag; path: string }) {
	const setCards = useContext(SetPageCardsContext);
	const key = bag.current.map((item) => `${item.id}\0${item.label}`).join("\n");
	useLayoutEffect(() => {
		setCards({ path, items: key ? [...bag.current] : null });
		return () => {
			setCards({ path, items: null });
		};
	}, [key, path, setCards, bag]);
	return null;
}

export function useSettingsPageCard(id: string | undefined, title: string): void {
	const bag = useContext(CardsBagContext);
	if (!bag || !id) {
		return;
	}
	const existing = bag.current.find((item) => item.id === id);
	if (existing) {
		existing.label = title;
		return;
	}
	bag.current.push({ id, label: title });
}
