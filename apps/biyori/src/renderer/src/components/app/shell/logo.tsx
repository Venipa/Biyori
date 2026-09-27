import LogoMark from "@/assets/logo.svg?react";
import { cn } from "@/mainview/lib/utils";

export default function Logo({ className }: { className?: string }) {
	return <LogoMark className={cn("size-4 shrink-0", className)} role='img' aria-label='Biyori' />;
}
