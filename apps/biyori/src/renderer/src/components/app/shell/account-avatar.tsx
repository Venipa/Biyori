import { t } from "@biyori/translations/react";
import { desktopRpc } from "@/desktop-rpc";
import { Image } from "@/mainview/components/ui/image";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";

export function AccountAvatar({ initials, avatarUrl, className }: { initials: string; avatarUrl: string | null; className: string }) {
	return (
		<span className={cn("relative flex items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-muted-foreground ring-1 ring-border", className)}>
			{initials}
			{avatarUrl ? <Image src={avatarUrl} alt='' className='absolute inset-0 size-full rounded-full' skeletonClassName='rounded-full' /> : null}
		</span>
	);
}

export type AccountService = "anilist" | "myanimelist";

export function openServiceProfile(service: AccountService, username: string): void {
	const name = encodeURIComponent(username);
	const url = service === "myanimelist" ? `https://myanimelist.net/profile/${name}` : `https://anilist.co/user/${name}/`;
	void desktopRpc.request.openExternal({ url });
}

export function serviceLabel(service: AccountService): string {
	return service === "myanimelist" ? t("anime.myAnimeList") : t("anime.anilist");
}

/** Service whose DB (and anime ids) the app is running on. */
export function useActiveService(): AccountService {
	return trpc.account.status.useQuery().data?.service ?? "anilist";
}

export function serviceAnimeUrl(service: AccountService, id: number): string {
	return service === "myanimelist" ? `https://myanimelist.net/anime/${id}` : `https://anilist.co/anime/${id}`;
}
