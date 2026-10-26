import { desktopRpc } from "@/desktop-rpc";
import { Image } from "@/mainview/components/ui/image";
import { cn } from "@/mainview/lib/utils";

export function AccountAvatar({ initials, avatarUrl, className }: { initials: string; avatarUrl: string | null; className: string }) {
	return (
		<span className={cn("relative flex items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-muted-foreground ring-1 ring-border", className)}>
			{initials}
			{avatarUrl ? <Image src={avatarUrl} alt='' className='absolute inset-0 size-full rounded-full' skeletonClassName='rounded-full' /> : null}
		</span>
	);
}

export function openAnilistProfile(username: string): void {
	void desktopRpc.request.openExternal({ url: `https://anilist.co/user/${encodeURIComponent(username)}/` });
}
