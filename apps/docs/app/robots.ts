import type { MetadataRoute } from "next";
import { absoluteFileUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
		sitemap: absoluteFileUrl("/sitemap.xml"),
	};
}
