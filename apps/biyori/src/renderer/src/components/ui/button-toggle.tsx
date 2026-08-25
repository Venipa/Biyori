import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/mainview/lib/utils";

const buttonToggleVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default:
					"border border-dashed border-border/70 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground data-[pressed]:border-solid data-[pressed]:border-border data-[pressed]:bg-muted data-[pressed]:text-foreground",
			},
			size: {
				default: "h-8 px-2.5",
				sm: "h-7 px-2.5 text-[0.8rem]",
				xs: "h-6 gap-1 px-2 text-xs",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ButtonToggleProps = Omit<ButtonPrimitive.Props, "children"> &
	VariantProps<typeof buttonToggleVariants> & {
		pressed: boolean;
		onPressedChange: (pressed: boolean) => void;
		children: ReactNode;
	};

function ButtonToggle({ className, variant = "default", size = "default", pressed, onPressedChange, onClick, children, ...props }: ButtonToggleProps) {
	return (
		<ButtonPrimitive
			type='button'
			data-slot='button-toggle'
			data-pressed={pressed ? "" : undefined}
			aria-pressed={pressed}
			className={cn(buttonToggleVariants({ variant, size }), className)}
			{...props}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) {
					onPressedChange(!pressed);
				}
			}}>
			{children}
		</ButtonPrimitive>
	);
}

export { ButtonToggle, buttonToggleVariants };
