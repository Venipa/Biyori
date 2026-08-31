import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/mainview/lib/utils";

const getSpans = () => [...new Array(12)].map((_, index) => <span key={`spinner-${index}`} />);

const spinnerVariants = cva("spinner relative m-0 box-border block p-0", {
	variants: {
		size: {
			default: "size-5",
			xs: "size-3",
			sm: "size-4",
			lg: "size-6",
			xl: "size-10",
		},
		color: {
			current: "text-current",
			foreground: "text-foreground",
			primary: "text-primary",
			default: "text-current",
		},
	},
	defaultVariants: {
		size: "default",
		color: "current",
	},
});

export type SpinnerProps = Omit<ComponentProps<"div">, "color"> & VariantProps<typeof spinnerVariants>;

function Spinner({ className, size, color, ...props }: SpinnerProps) {
	return (
		<div className={cn(spinnerVariants({ size, color, className }))} {...props}>
			<div className='relative top-1/2 left-1/2 size-full'>{getSpans()}</div>
		</div>
	);
}

Spinner.displayName = "Spinner";

export { Spinner };
