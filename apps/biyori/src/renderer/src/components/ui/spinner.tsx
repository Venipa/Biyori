import { cn } from "@/mainview/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const getSpans = () =>
	[...new Array(12)].map((_, index) => (
		<span key={`spinner-${index}`} />
	));

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
			current: "",
			foreground: "",
			primary: "",
			default: "",
		},
	},
	defaultVariants: {
		size: "default",
		color: "current",
	},
});

const colorMap: Record<string, string> = {
	current: "currentColor",
	foreground: "var(--foreground)",
	primary: "var(--primary)",
	default: "currentColor",
};

const spinnerColor = (color: string): string =>
	colorMap[color ?? "current"] ?? colorMap.current;

export type SpinnerProps = Omit<ComponentProps<"div">, "color"> &
	VariantProps<typeof spinnerVariants>;

function Spinner({ className, size, color, style, ...props }: SpinnerProps) {
	const spinnerColorValue = spinnerColor(color ?? "current");
	return (
		<div
			className={cn(spinnerVariants({ size, className }))}
			style={{
				...style,
				["--spinner-foreground" as string]: spinnerColorValue,
			}}
			{...props}
		>
			<div className="relative top-1/2 left-1/2 h-full w-full">{getSpans()}</div>
		</div>
	);
}

Spinner.displayName = "Spinner";

export { Spinner };
