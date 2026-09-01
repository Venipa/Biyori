import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Provider } from "@/components/provider";
import { assetPath } from "@/lib/paths";
import { appDescription, appName, appTagline, siteUrl } from "@/lib/shared";
import "./global.css";

const inter = Inter({
	subsets: ["latin"],
});

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: `${appName} - ${appTagline}`,
		template: `%s | ${appName}`,
	},
	description: appDescription,
	applicationName: appName,
	icons: {
		icon: assetPath("/favicon.ico"),
	},
	openGraph: {
		type: "website",
		url: siteUrl,
		siteName: appName,
		title: `${appName} - ${appTagline}`,
		description: appDescription,
		locale: "en_US",
	},
	twitter: {
		card: "summary_large_image",
		title: `${appName} - ${appTagline}`,
		description: appDescription,
	},
};

export default function Layout({ children }: LayoutProps<"/">) {
	return (
		<html lang='en' className={inter.className} suppressHydrationWarning>
			<body className='flex min-h-screen flex-col'>
				<Provider>{children}</Provider>
			</body>
		</html>
	);
}
