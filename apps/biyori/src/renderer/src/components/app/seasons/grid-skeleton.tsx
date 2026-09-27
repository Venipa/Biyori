import type { SeasonViewAs } from "@/lib/schemas/seasons";
import { SeasonAltSkeleton, type SeasonAltView } from "@/mainview/components/app/seasons/display";
import { Skeleton } from "@/mainview/components/ui/skeleton";

export function isAltView(viewAs: SeasonViewAs): viewAs is SeasonAltView {
	return viewAs === "guide" || viewAs === "skyline";
}

export function SeasonGridSkeleton({ viewAs }: { viewAs: SeasonViewAs }) {
	if (isAltView(viewAs)) {
		return <SeasonAltSkeleton viewAs={viewAs} />;
	}
	if (viewAs === "images") {
		return (
			<ul className='grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
				{["i0", "i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "i10", "i11"].map((id) => (
					<li key={id}>
						<Skeleton className='aspect-2/3 w-full rounded-md' />
					</li>
				))}
			</ul>
		);
	}
	return (
		<ul className='grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3'>
			{["t0", "t1", "t2", "t3", "t4", "t5"].map((id) => (
				<li key={id}>
					<Skeleton className='h-44 w-full rounded-md' />
				</li>
			))}
		</ul>
	);
}
