import type { ComponentType } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";

export function PlaceholderView({ icon: Icon, title, description }: { icon: ComponentType<{ className?: string }>; title: string; description: string }) {
	return (
		<div className='flex h-full items-center justify-center p-4'>
			<Empty className='min-h-64 w-full max-w-2xl min-w-0 flex-none justify-center border border-dashed'>
				<EmptyHeader>
					<EmptyMedia variant='icon'>
						<Icon />
					</EmptyMedia>
					<EmptyTitle>{title}</EmptyTitle>
					<EmptyDescription>{description}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</div>
	);
}
