import { createBannerImage } from "@/lib/og";

export const revalidate = false;

export function GET() {
	return createBannerImage(2);
}
