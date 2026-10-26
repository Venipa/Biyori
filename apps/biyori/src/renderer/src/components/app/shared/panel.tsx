import type { ReactElement, ReactNode } from "react";
import { cn } from "@/mainview/lib/utils";

/** Quiet bordered section with a small muted title (statistics, now playing). */
export function Panel({ title, className, children }: { title: string; className?: string; children: ReactNode }): ReactElement {
	return (
		<section className={cn("flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4", className)}>
			<h2 className='text-xs font-medium text-muted-foreground'>{title}</h2>
			{children}
		</section>
	);
}
