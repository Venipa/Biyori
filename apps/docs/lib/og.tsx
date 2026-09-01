import { appName, appTagline } from "@/lib/shared";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

const PILLS = [
	{ label: "List", icon: "list" },
	{ label: "Library", icon: "library" },
	{ label: "Torrents", icon: "torrents" },
] as const;

const charcoal = {
	field: "#0a0a0a",
	spot: "#380D0D", // japanese maple "#db1717",
	ink: "#f4f4f5",
	mute: "#a3a3a3",
	line: "rgba(255,255,255,0.14)",
	pillFill: "rgba(14,14,14,0.9)",
} as const;

async function getLogoDataUrl(): Promise<string> {
	const data = await readFile(join(process.cwd(), "public/logo.png"));
	return `data:image/png;base64,${data.toString("base64")}`;
}

async function getScreenshotDataUrl(): Promise<string> {
	const data = await readFile(join(process.cwd(), "public/app-screenshot-1.png"));
	return `data:image/png;base64,${data.toString("base64")}`;
}

function OgField({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				display: "flex",
				position: "relative",
				width: "100%",
				height: "100%",
				overflow: "hidden",
				background: charcoal.field,
				color: charcoal.ink,
			}}>
			<div
				style={{
					display: "flex",
					position: "absolute",
					width: 1600,
					height: 1600,
					borderRadius: 800,
					background: charcoal.spot,
					opacity: 1,
					top: -420,
					left: "50%",
					marginLeft: -800,
					boxShadow: `0 0 200px ${charcoal.spot}`,
				}}
			/>
			<div
				style={{
					display: "flex",
					position: "absolute",
					inset: 48,
					border: `1px solid ${charcoal.line}`,
					borderRadius: 28,
				}}
			/>
			{children}
		</div>
	);
}

function PillIcon({ name, size }: { name: (typeof PILLS)[number]["icon"]; size: number }) {
	const stroke = {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: charcoal.ink,
		strokeWidth: 2.25,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
	};
	if (name === "list") {
		return (
			<svg {...stroke}>
				<path d='M8 6h13' />
				<path d='M8 12h13' />
				<path d='M8 18h13' />
				<path d='M3 6h.01' />
				<path d='M3 12h.01' />
				<path d='M3 18h.01' />
			</svg>
		);
	}
	if (name === "library") {
		return (
			<svg {...stroke}>
				<path d='M10.7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v4.1' />
				<circle cx='17' cy='17' r='3' />
				<path d='m21 21-1.9-1.9' />
			</svg>
		);
	}
	return (
		<svg {...stroke}>
			<path d='M12 15V3' />
			<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
			<path d='m7 10 5 5 5-5' />
		</svg>
	);
}

function Pill({ label, icon, fontSize, padY, padX }: { label: string; icon: (typeof PILLS)[number]["icon"]; fontSize: number; padY: number; padX: number }) {
	const iconSize = Math.round(fontSize * 1.05);
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 12,
				border: `1px solid ${charcoal.line}`,
				background: charcoal.pillFill,
				borderRadius: 999,
				padding: `${padY}px ${padX}px`,
				fontSize,
				fontWeight: 600,
				letterSpacing: 0.4,
				color: charcoal.ink,
			}}>
			<PillIcon name={icon} size={iconSize} />
			{label}
		</div>
	);
}

function HomeOg({ logoSrc, screenshotSrc }: { logoSrc: string; screenshotSrc: string }) {
	const shotW = 1680;
	const shotH = 948;
	return (
		<OgField>
			<div
				style={{
					display: "flex",
					position: "absolute",
					left: "50%",
					bottom: -220,
					marginLeft: -(shotW / 2),
					width: shotW,
					height: shotH,
					background: charcoal.field,
					opacity: 0.82,
					transform: "rotate(0deg) skewX(0deg) scale(1)",
					transformOrigin: "840px 948px",
					borderRadius: 16,
					border: `2px solid ${charcoal.line}`,
					overflow: "hidden",
				}}>
				{/* biome-ignore lint: ImageResponse has no next/image */}
				<img
					src={screenshotSrc}
					alt=''
					width={shotW}
					height={shotH}
					style={{
						width: shotW,
						height: shotH,
						opacity: 0.55,
					}}
				/>
			</div>
			<div
				style={{
					display: "flex",
					position: "relative",
					flexDirection: "column",
					alignItems: "center",
					width: "100%",
					height: "100%",
					padding: "80px 120px 0",
				}}>
				{/* biome-ignore lint: ImageResponse has no next/image */}
				<img src={logoSrc} alt='' width={168} height={168} style={{ borderRadius: 36 }} />
				<div style={{ marginTop: 32, fontSize: 168, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>{appName}</div>
				<div style={{ marginTop: 16, fontSize: 36, fontWeight: 500, color: charcoal.mute }}>{appTagline}</div>
				<div style={{ display: "flex", marginTop: 40, gap: 16 }}>
					{PILLS.map((pill) => (
						<Pill key={pill.label} label={pill.label} icon={pill.icon} fontSize={28} padY={14} padX={32} />
					))}
				</div>
			</div>
		</OgField>
	);
}

function DocsOg({ title, description, logoSrc }: { title: string; description?: string; logoSrc: string }) {
	return (
		<OgField>
			<div
				style={{
					display: "flex",
					position: "relative",
					flexDirection: "column",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					padding: "72px 80px",
				}}>
				<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
					{/* biome-ignore lint: ImageResponse has no next/image */}
					<img src={logoSrc} alt='' width={48} height={48} style={{ borderRadius: 12 }} />
					<div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>{appName}</div>
				</div>
				<div style={{ marginTop: 48, fontSize: 64, fontWeight: 800, letterSpacing: -1.6, lineHeight: 1.08, maxWidth: 980 }}>{title}</div>
				{description ? <div style={{ marginTop: 20, fontSize: 28, color: charcoal.mute, maxWidth: 880, lineHeight: 1.35 }}>{description}</div> : null}
			</div>
		</OgField>
	);
}

export async function createOgImage({ title, description }: { title: string; description?: string }) {
	const logoSrc = await getLogoDataUrl();
	return new ImageResponse(<DocsOg title={title} description={description} logoSrc={logoSrc} />, {
		width: 1200,
		height: 630,
	});
}

export const homeOgSize = {
	width: 2400,
	height: 1260,
} as const;

export async function createHomeOgImage() {
	const [logoSrc, screenshotSrc] = await Promise.all([getLogoDataUrl(), getScreenshotDataUrl()]);
	return new ImageResponse(<HomeOg logoSrc={logoSrc} screenshotSrc={screenshotSrc} />, {
		width: homeOgSize.width,
		height: homeOgSize.height,
	});
}
