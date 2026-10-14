import { setUiLocale } from "@biyori/translations/react";
import { useEffect } from "react";
import { trpc } from "@/mainview/trpc";

export function useSyncUiLocale(): void {
	const locale = trpc.settings.get.useQuery(undefined, {
		select: (settings) => settings.uiLocale,
	});
	const value = locale.data ?? "en";
	useEffect(() => {
		setUiLocale(value);
	}, [value]);
}
