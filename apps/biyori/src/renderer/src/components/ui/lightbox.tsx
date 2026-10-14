import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type * as React from "react";
import { APP_TOOLBAR_HEIGHT } from "@/components/app/shell/toolbar";
import { cn } from "@/mainview/lib/utils";

function Lightbox({ ...props }: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root data-slot='lightbox' {...props} />;
}

function LightboxOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot='lightbox-overlay'
			forceRender
			className={cn(
				"fixed inset-0 isolate z-[80] bg-black/55 backdrop-blur-sm duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
				className,
			)}
			style={{ top: `${APP_TOOLBAR_HEIGHT}px` }}
			{...props}
		/>
	);
}

function LightboxContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
	return (
		<DialogPrimitive.Portal>
			<LightboxOverlay />
			<DialogPrimitive.Popup
				data-slot='lightbox-content'
				className={cn(
					"fixed top-1/2 left-1/2 z-[80] flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 bg-transparent p-0 text-sm text-white outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
					className,
				)}
				{...props}>
				{children}
			</DialogPrimitive.Popup>
		</DialogPrimitive.Portal>
	);
}

function LightboxFooter({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot='lightbox-footer' className={cn("flex items-center justify-center gap-2", className)} {...props} />;
}

function LightboxTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return <DialogPrimitive.Title data-slot='lightbox-title' className={cn("text-base leading-none font-medium", className)} {...props} />;
}

export { Lightbox, LightboxContent, LightboxFooter, LightboxOverlay, LightboxTitle };
