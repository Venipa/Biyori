import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/mainview/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverContent({
	align = "start",
	side = "bottom",
	sideOffset = 4,
	className,
	...props
}: PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner className='isolate z-50 outline-none' align={align} side={side} sideOffset={sideOffset}>
				<PopoverPrimitive.Popup
					data-slot='popover-content'
					className={cn(
						"z-50 max-h-(--available-height) origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:scale-97 data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-97 data-starting-style:opacity-0 motion-reduce:transition-opacity",
						className,
					)}
					{...props}
				/>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	);
}

export { Popover, PopoverContent, PopoverTrigger };
