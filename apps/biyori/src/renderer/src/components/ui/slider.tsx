import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/mainview/lib/utils";

function Slider({ className, "aria-label": ariaLabel, ...props }: SliderPrimitive.Root.Props<number>) {
	return (
		<SliderPrimitive.Root thumbAlignment='edge' data-slot='slider' className={cn("flex w-full touch-none items-center select-none", className)} {...props}>
			<SliderPrimitive.Control className='relative flex w-full items-center py-2'>
				<SliderPrimitive.Track className='relative h-1 w-full grow overflow-hidden rounded-full bg-muted'>
					<SliderPrimitive.Indicator className='h-full bg-foreground' />
				</SliderPrimitive.Track>
				<SliderPrimitive.Thumb
					getAriaLabel={ariaLabel ? () => ariaLabel : undefined}
					className='block size-3.5 shrink-0 rounded-full border-2 border-foreground bg-background shadow-sm transition-transform duration-150 ease-out outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 data-dragging:scale-110 motion-reduce:transition-none'
				/>
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
