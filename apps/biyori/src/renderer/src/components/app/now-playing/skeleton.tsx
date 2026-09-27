import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";

export function NowPlayingSkeleton() {
	return (
		<ScrollArea className='h-full min-h-0'>
			<div className='mx-auto flex w-full flex-col gap-6 p-4'>
				<div className='flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-end'>
					<Skeleton className='aspect-2/3 w-28 shrink-0 rounded-lg sm:w-32' />
					<div className='flex min-w-0 flex-1 flex-col gap-3'>
						<Skeleton className='h-3 w-24' />
						<Skeleton className='h-7 w-2/3' />
						<Skeleton className='h-4 w-40' />
						<div className='flex gap-2'>
							<Skeleton className='h-5 w-24 rounded-full' />
							<Skeleton className='h-5 w-16 rounded-full' />
						</div>
						<Skeleton className='h-4 w-48' />
					</div>
				</div>
				<div className='flex flex-col gap-2'>
					<Skeleton className='h-4 w-20' />
					<Skeleton className='h-24 w-full' />
				</div>
			</div>
		</ScrollArea>
	);
}
