import type { ReactNode } from "react";
import { Spinner } from "@/mainview/components/ui/spinner";
import { cn } from "@/mainview/lib/utils";

export function PageLoad({ loading, children }: { loading: boolean; children: ReactNode }) {
	return (
		<div className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", loading ? "bg-background" : "animate-in fade-in zoom-in-95 duration-200")}>
			{children}
			{loading ? (
				<div className='absolute inset-0 z-10 flex items-center justify-center bg-background' role='status' aria-label='Loading'>
					<Spinner size='lg' color='foreground' />
				</div>
			) : null}
		</div>
	);
}
