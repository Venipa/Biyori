import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/mainview/components/ui/tooltip";

type HintProps = {
	content: ReactNode;
	children: ReactElement;
	className?: string;
} & Pick<TooltipPrimitive.Trigger.Props, "delay" | "closeDelay" | "closeOnClick" | "disabled"> &
	Pick<TooltipPrimitive.Root.Props, "open" | "defaultOpen" | "onOpenChange" | "disableHoverablePopup"> &
	Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset" | "align" | "alignOffset">;

function Hint({ content, children, className, side = "top", sideOffset, align, alignOffset, delay, closeDelay, closeOnClick, disabled, ...root }: HintProps) {
	return (
		<Tooltip {...root}>
			<TooltipTrigger render={children} delay={delay} closeDelay={closeDelay} closeOnClick={closeOnClick} disabled={disabled} />
			<TooltipContent className={className} side={side} sideOffset={sideOffset} align={align} alignOffset={alignOffset}>
				{content}
			</TooltipContent>
		</Tooltip>
	);
}

export type { HintProps };
export { Hint };
