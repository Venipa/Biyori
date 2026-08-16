import { getThemeMode, setThemeMode, subscribeTheme, ThemeMode } from "@renderer/lib/theme";
import { useCallback, useSyncExternalStore } from "react";

export function useTheme() {
	const theme = useSyncExternalStore(subscribeTheme, getThemeMode, getThemeMode);
  const setTheme = useCallback((next: ThemeMode) => {
    setThemeMode(next);
  }, []);
  return [theme, setTheme] as const;
}
