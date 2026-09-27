import { useEffect, useRef, useState } from "react";
import type { MediaImageKind } from "@/lib/schemas/media-image";
import { Image } from "@/mainview/components/ui/image";
import { trpc } from "@/mainview/trpc";

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

export function AnimeCover({ id, kind = "cover", sourceUrl, coverUrl, alt, className, width, height, lazy = false }: AnimeCoverProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(!lazy);
	const enabled = visible && id != null;
	const query = trpc.covers.get.useQuery(
		{
			animeId: id ?? 0,
			kind,
			sourceUrl: sourceUrl || coverUrl,
			coverUrl,
		},
		{ enabled, staleTime: Number.POSITIVE_INFINITY },
	);
	const [objectUrl, setObjectUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!lazy) {
			return;
		}
		const node = rootRef.current;
		if (!node) {
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ rootMargin: "120px" },
		);
		observer.observe(node);
		return () => {
			observer.disconnect();
		};
	}, [lazy]);

	useEffect(() => {
		if (!query.data) {
			setObjectUrl(null);
			return;
		}
		const bytes = Uint8Array.from(atob(query.data.base64), (char) => char.charCodeAt(0));
		const url = URL.createObjectURL(new Blob([bytes], { type: query.data.mime }));
		setObjectUrl(url);
		return () => {
			URL.revokeObjectURL(url);
		};
	}, [query.data]);

	return (
		<div ref={rootRef} className={className}>
			<Image src={objectUrl} alt={alt} width={width} height={height} className='size-full' />
		</div>
	);
}
