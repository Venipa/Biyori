"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/mainview/lib/utils";

type ScrollAreaProps = ScrollAreaPrimitive.Root.Props & { viewportClassName?: string };
function ScrollArea({ className, children, viewportClassName, ...props }: ScrollAreaProps) {
	return (
		<ScrollAreaPrimitive.Root data-slot='scroll-area' className={cn("group/scroll-area relative h-full", className)} {...props}>
			<ScrollAreaPrimitive.Viewport
				data-slot='scroll-area-viewport'
				className={cn(
					"size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
					viewportClassName,
				)}>
				{children}
			</ScrollAreaPrimitive.Viewport>
			<ScrollBar />
			<ScrollBar orientation='horizontal' />
			<ScrollAreaPrimitive.Corner />
		</ScrollAreaPrimitive.Root>
	);
}

function ScrollBar({ className, orientation = "vertical", ...props }: ScrollAreaPrimitive.Scrollbar.Props) {
	return (
		<ScrollAreaPrimitive.Scrollbar
			data-slot='scroll-area-scrollbar'
			data-orientation={orientation}
			orientation={orientation}
			className={cn(
				"flex touch-none p-px select-none opacity-0 transition-opacity duration-150 pointer-events-none",
				"data-hovering:opacity-100 data-hovering:pointer-events-auto",
				"data-scrolling:opacity-100 data-scrolling:pointer-events-auto data-scrolling:duration-0",
				"group-focus-within/scroll-area:opacity-100 group-focus-within/scroll-area:pointer-events-auto",
				"data-horizontal:h-1.5 data-horizontal:flex-col",
				"data-vertical:h-full data-vertical:w-1.5",
				className,
			)}
			{...props}>
			<ScrollAreaPrimitive.Thumb data-slot='scroll-area-thumb' className='relative flex-1 rounded-full bg-border hover:bg-muted-foreground/50 active:bg-muted-foreground z-40' />
		</ScrollAreaPrimitive.Scrollbar>
	);
}

export { ScrollArea, ScrollBar };
