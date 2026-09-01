import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { appDescription, appName, appTagline, brandColor, brandColorRgb } from "@/lib/shared";

export type OgImageType = "screenshot" | "render" | "render-auto";

async function getLogoDataUrl(): Promise<string> {
	const data = await readFile(join(process.cwd(), "public/logo.png"));
	return `data:image/png;base64,${data.toString("base64")}`;
}

async function getScreenshotDataUrl(): Promise<string> {
	const data = await readFile(join(process.cwd(), "public/app-screenshot-1.png"));
	return `data:image/png;base64,${data.toString("base64")}`;
}

function DocsOg({ title, description, logoSrc, screenshotSrc }: { title: string; description?: string; logoSrc: string; screenshotSrc: string }) {
	return (
		<div
			style={{
				display: "flex",
				position: "relative",
				width: "100%",
				height: "100%",
				overflow: "hidden",
				background: "#0f1115",
				color: "#fafafa",
			}}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={screenshotSrc}
				alt=''
				width={920}
				height={520}
				style={{
					position: "absolute",
					right: -80,
					bottom: -120,
					opacity: 0.45,
					transform: "rotate(-6deg)",
					borderRadius: 16,
					border: "1px solid rgba(255,255,255,0.1)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage: "linear-gradient(90deg, #0f1115 28%, rgba(15,17,21,0.82) 58%, rgba(15,17,21,0.25) 100%)",
				}}
			/>
			<div
				style={{
					display: "flex",
					position: "relative",
					flexDirection: "column",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					padding: "64px 72px",
				}}>
				<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={logoSrc} alt='' width={52} height={52} style={{ borderRadius: 12 }} />
					<span style={{ fontSize: 28, fontWeight: 800 }}>{appName}</span>
				</div>
				<div style={{ marginTop: 40, fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 760 }}>{title}</div>
				{description ? <div style={{ marginTop: 20, fontSize: 28, color: "#a1a1aa", maxWidth: 720 }}>{description}</div> : null}
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
		</div>
	);
}

function HomeOg({ logoSrc, screenshotSrc }: { logoSrc: string; screenshotSrc: string }) {
	return (
		<div
			style={{
				display: "flex",
				position: "relative",
				width: "100%",
				height: "100%",
				overflow: "hidden",
				background: "#0f1115",
				color: "#fafafa",
				padding: "48px 56px",
				alignItems: "center",
				justifyContent: "space-between",
			}}>
			<div style={{ display: "flex", flexDirection: "column", width: 480, maxWidth: 480 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={logoSrc} alt='' width={72} height={72} style={{ borderRadius: 16 }} />
					<div style={{ display: "flex", flexDirection: "column" }}>
						<div style={{ fontSize: 36, fontWeight: 800 }}>{appName}</div>
						<div style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: `rgb(${brandColorRgb})` }}>{appTagline}</div>
					</div>
				</div>
				<div style={{ marginTop: 28, fontSize: 24, color: "#a1a1aa", lineHeight: 1.4 }}>{appDescription}</div>
			</div>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={screenshotSrc}
				alt=''
				width={620}
				height={350}
				style={{
					borderRadius: 12,
					border: "1px solid rgba(255,255,255,0.14)",
					transform: "rotate(-2deg)",
				}}
			/>
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
	const [logoSrc, screenshotSrc] = await Promise.all([getLogoDataUrl(), getScreenshotDataUrl()]);
	return new ImageResponse(<DocsOg title={title} description={description} logoSrc={logoSrc} screenshotSrc={screenshotSrc} />, {
		width: 1200,
		height: 630,
	});
}

export async function createHomeOgImage() {
	const [logoSrc, screenshotSrc] = await Promise.all([getLogoDataUrl(), getScreenshotDataUrl()]);
	return new ImageResponse(<HomeOg logoSrc={logoSrc} screenshotSrc={screenshotSrc} />, {
		width: 1200,
		height: 630,
	});
}
