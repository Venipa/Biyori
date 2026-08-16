import icon from "@/assets/icon.png";
import { Image } from "@/mainview/components/ui/image";
import { cn } from "@/mainview/lib/utils";

export default function Logo({ className }: { className?: string }) {
  return (
    <Image src={icon} alt="Biyori" className={cn("size-4", className)} />
  );
}
