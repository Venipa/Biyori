import { useCallback, useSyncExternalStore } from "react";
import { getThemeMode, setThemeMode, subscribeTheme, type ThemeMode } from "@/mainview/lib/theme";

export function useTheme() {
	const theme = useSyncExternalStore(subscribeTheme, getThemeMode, getThemeMode);
	const setTheme = useCallback((next: ThemeMode) => {
		setThemeMode(next);
	}, []);
	return [theme, setTheme] as const;
}
