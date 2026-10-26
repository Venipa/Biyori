import { mediaImageUrl } from "@/lib/media-url";
import type { MediaImageKind } from "@/lib/schemas/media-image";
import { Image } from "@/mainview/components/ui/image";

type AnimeCoverProps = {
	id: number | null | undefined;
	kind?: MediaImageKind;
	sourceUrl?: string;
	coverUrl?: string;
	alt: string;
	className?: string;
	width?: number;
	height?: number;
	lazy?: boolean;
};

/** Served by the biyori-media:// protocol, so Chromium's image cache handles reuse across mounts and pages. */
export function AnimeCover({ id, kind = "cover", sourceUrl, coverUrl, alt, className, width, height, lazy = false }: AnimeCoverProps) {
	const src = id == null ? null : mediaImageUrl(kind, id, sourceUrl || (kind === "cover" ? coverUrl : undefined));
	return (
		<div className={className}>
			<Image src={src} alt={alt} width={width} height={height} loading={lazy ? "lazy" : undefined} className='size-full' />
		</div>
	);
}
