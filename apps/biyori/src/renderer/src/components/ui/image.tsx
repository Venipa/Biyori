import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { cn } from "@/mainview/lib/utils";

const imageVariants = cva("relative overflow-hidden", {
	variants: {
		variant: {
			default: "",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

type ImageProps = Omit<ComponentProps<"img">, "src"> &
	VariantProps<typeof imageVariants> & {
		src?: string | null;
		skeletonClassName?: string;
		imageClassName?: string;
	};

function Image({
	src,
	alt,
	className,
	skeletonClassName,
	imageClassName,
	variant,
	width,
	height,
	onLoad,
	onError,
	...props
}: ImageProps) {
	const imgRef = useRef<HTMLImageElement>(null);
	const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const loaded = Boolean(src) && loadedSrc === src;
	const failed = Boolean(src) && failedSrc === src;

	useEffect(() => {
		const node = imgRef.current;
		if (!src || !node) {
			return;
		}
		if (node.complete && node.naturalWidth > 0) {
			setLoadedSrc(src);
			setFailedSrc((current) => (current === src ? null : current));
		}
	}, [src]);

	return (
		<div
			data-slot="image"
			className={cn(imageVariants({ variant }), className)}
			style={
				width != null || height != null
					? { width: width ?? undefined, height: height ?? undefined }
					: undefined
			}
		>
			<Skeleton
				aria-hidden
				className={cn(
					"absolute inset-0 size-full rounded-[inherit] transition-opacity duration-200 ease-out motion-reduce:transition-none",
					loaded ? "pointer-events-none opacity-0" : "opacity-100",
					skeletonClassName,
				)}
			/>
			{src && !failed ? (
				<img
					ref={imgRef}
					src={src}
					alt={loaded ? alt : ""}
					aria-hidden={loaded ? undefined : true}
					width={width}
					height={height}
					decoding="async"
					className={cn(
						"relative size-full object-cover transition-[opacity,filter] duration-200 ease-out motion-reduce:transition-none",
						loaded ? "opacity-100 blur-0" : "opacity-0 blur-[2px]",
						imageClassName,
					)}
					onLoad={(event) => {
						setLoadedSrc(src);
						setFailedSrc((current) => (current === src ? null : current));
						onLoad?.(event);
					}}
					onError={(event) => {
						setFailedSrc(src);
						setLoadedSrc((current) => (current === src ? null : current));
						onError?.(event);
					}}
					{...props}
				/>
			) : null}
		</div>
	);
}

export { Image, imageVariants };
