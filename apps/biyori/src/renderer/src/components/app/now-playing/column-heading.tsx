import { Separator } from "@/mainview/components/ui/separator";
import { cn } from "@/mainview/lib/utils";

const dayLabelClass = "mt-1 h-4 text-xs leading-4";

export function IdleColumnHeading({ children, sticky }: { children: string; sticky?: boolean }) {
	return (
		<>
			<h2 className={cn("mb-1 text-sm leading-5 font-semibold", sticky && "sticky left-0 z-10 w-max bg-background/90 pr-4 backdrop-blur-sm")}>{children}</h2>
			<Separator className={cn("mb-2", sticky && "sticky left-0 z-10 w-40 md:w-50")} />
		</>
	);
}

export function IdleDayLabel({ children }: { children: string }) {
	return <p className={cn(dayLabelClass, "sticky left-0 z-10 w-max bg-background/90 pr-4 text-muted-foreground")}>{children}</p>;
}

export function IdleDayLabelSpacer() {
	return <div aria-hidden className={dayLabelClass} />;
}
