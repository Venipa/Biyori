import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { appDescription, appName, appTagline, brandColor, brandColorRgb } from "@/lib/shared";

export type OgImageType = "screenshot" | "render" | "render-auto";

async function getLogoDataUrl(): Promise<string> {
	const data = await readFile(join(process.cwd(), "public/logo.png"));
	return `data:image/png;base64,${data.toString("base64")}`;
}

function DocsOg({ title, description, logoSrc }: { title: string; description?: string; logoSrc: string }) {
	return (
		<div
			style={{
				display: "flex",
				width: "100%",
				height: "100%",
				background: "#0f1115",
				color: "#fafafa",
				padding: "64px 72px",
				flexDirection: "column",
				justifyContent: "center",
			}}>
			<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={logoSrc} alt='' width={52} height={52} style={{ borderRadius: 12 }} />
				<span style={{ fontSize: 28, fontWeight: 800 }}>{appName}</span>
			</div>
			<div style={{ marginTop: 40, fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>{title}</div>
			{description ? <div style={{ marginTop: 20, fontSize: 28, color: "#a1a1aa", maxWidth: 820 }}>{description}</div> : null}
			<div
				style={{
					marginTop: 36,
					width: 96,
					height: 6,
					borderRadius: 999,
					background: brandColor,
				}}
			/>
		</div>
	);
}

function HomeOg({ logoSrc }: { logoSrc: string }) {
	return (
		<div
			style={{
				display: "flex",
				width: "100%",
				height: "100%",
				background: "#0f1115",
				color: "#fafafa",
				padding: "56px 64px",
				flexDirection: "column",
				justifyContent: "center",
			}}>
			<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={logoSrc} alt='' width={72} height={72} style={{ borderRadius: 16 }} />
				<div style={{ display: "flex", flexDirection: "column" }}>
					<div style={{ fontSize: 36, fontWeight: 800 }}>{appName}</div>
					<div style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: `rgb(${brandColorRgb})` }}>{appTagline}</div>
				</div>
			</div>
			<div style={{ marginTop: 36, fontSize: 28, color: "#a1a1aa", maxWidth: 880, lineHeight: 1.4 }}>{appDescription}</div>
		</div>
	);
}

export async function createOgImage({
	title,
	description,
}: {
	title: string;
	description?: string;
	logo?: "svg" | "png";
	image?: string;
	imageType?: OgImageType;
	color?: string;
}) {
	const logoSrc = await getLogoDataUrl();
	return new ImageResponse(<DocsOg title={title} description={description} logoSrc={logoSrc} />, {
		width: 1200,
		height: 630,
	});
}

export async function createHomeOgImage() {
	const logoSrc = await getLogoDataUrl();
	return new ImageResponse(<HomeOg logoSrc={logoSrc} />, {
		width: 1200,
		height: 630,
	});
}
