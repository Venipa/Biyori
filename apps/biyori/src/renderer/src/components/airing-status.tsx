import { cn } from "@/mainview/lib/utils";

const AIRING_STATUS_CLASS: Record<string, string> = {
	"Currently airing": "bg-success",
	"Finished airing": "bg-airing-finished",
	Finished: "bg-airing-finished",
	"Not yet released": "bg-destructive",
	Cancelled: "bg-destructive",
	Hiatus: "bg-chart-3",
};

export function airingStatusClass(status: string | null | undefined): string {
	if (!status) {
		return "bg-muted-foreground/30";
	}
	return AIRING_STATUS_CLASS[status] ?? "bg-muted-foreground/30";
}

export function AiringStatusMark({
	status,
	shape,
	className,
	nativeTitle = true,
}: {
	status: string | null | undefined;
	shape: "square" | "dot";
	className?: string;
	nativeTitle?: boolean;
}) {
	const label = status?.trim() || "Unknown";
	return (
		<span
			aria-label={label}
			title={nativeTitle ? label : undefined}
			className={cn("inline-block shrink-0", shape === "square" ? "size-2.5 rounded-none" : "size-2 rounded-full", airingStatusClass(status), className)}
		/>
	);
}
