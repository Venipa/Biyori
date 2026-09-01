import { CircleAlertIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";

export function RouterFallback({ title, description }: { title: string; description: string }) {
	if (document.visibilityState === "hidden") {
		return null;
	}
	return (
		<Empty className='h-full'>
			<EmptyHeader>
				<EmptyMedia variant='icon'>
					<CircleAlertIcon />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
