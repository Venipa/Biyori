import { Separator } from "@/mainview/components/ui/separator";
import { cn } from "@/mainview/lib/utils";

export function IdleColumnHeading({ children, sticky }: { children: string; sticky?: boolean }) {
	return (
		<>
			<h2 className={cn("mb-1 text-sm leading-5 font-semibold", sticky && "sticky left-0 z-10 w-max bg-background/90 pr-4 backdrop-blur-sm")}>{children}</h2>
			<Separator className={cn("mb-2", sticky && "sticky left-0 z-10 w-40 md:w-50")} />
		</>
	);
}
