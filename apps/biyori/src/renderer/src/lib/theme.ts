export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

const STORAGE_KEY = "biyori.theme";

let mode: ThemeMode = "system";
const listeners = new Set<() => void>();

function isThemeMode(value: string | null): value is ThemeMode {
	return value === "light" || value === "dark" || value === "system";
}

function systemPrefersDark(): boolean {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(next: ThemeMode): "light" | "dark" {
	if (next === "system") {
		return systemPrefersDark() ? "dark" : "light";
	}
	return next;
}

function applyTheme(next: ThemeMode): void {
	const resolved = resolveTheme(next);
	document.documentElement.classList.toggle("dark", resolved === "dark");
	document.documentElement.style.colorScheme = resolved;
}

function emit(): void {
	for (const listener of listeners) {
		listener();
	}
}

export function getThemeMode(): ThemeMode {
	return mode;
}

export function setThemeMode(next: ThemeMode): void {
	mode = next;
	window.localStorage.setItem(STORAGE_KEY, next);
	applyTheme(next);
	emit();
}

export function subscribeTheme(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function initTheme(): void {
	const stored = window.localStorage.getItem(STORAGE_KEY);
	mode = isThemeMode(stored) ? stored : "system";
	applyTheme(mode);
	window
		.matchMedia("(prefers-color-scheme: dark)")
		.addEventListener("change", () => {
			if (mode === "system") {
				applyTheme("system");
			}
		});
}
