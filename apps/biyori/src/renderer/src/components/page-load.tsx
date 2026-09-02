import type { ReactNode } from "react";
import { Spinner } from "@/mainview/components/ui/spinner";
import { cn } from "@/mainview/lib/utils";

export function PageLoad({ loading, children }: { loading: boolean; children: ReactNode }) {
	return (
		<div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", loading ? "bg-background" : "animate-in fade-in zoom-in-95 duration-200")}>
			{loading ? (
				<div className='flex min-h-0 flex-1 items-center justify-center' role='status' aria-label='Loading'>
					<Spinner size='lg' color='foreground' />
				</div>
			) : (
				children
			)}
		</div>
	);
}
