import { spawn } from "node:child_process";
import { isBrowserProcess, matchMediaPlayerId, matchStreamingProviderId, processKey } from "../../lib/recognition-catalog";
import type { AppSettings } from "../../lib/schemas/app-settings";
import type { NowPlayingMedia } from "./types";

const VIDEO_EXT = "mkv|mp4|avi|webm|mov|wmv|flv|ts|m2ts|mpg|mpeg";

type WindowRow = {
	name: string;
	title: string;
	windowId: string;
	foreground: boolean;
};

function extractFilePath(title: string): string | null {
	const win = title.match(new RegExp(String.raw`([A-Za-z]:\\[^:*?"<>|]+\.(?:${VIDEO_EXT}))`, "i"));
	if (win?.[1]) {
		return win[1];
	}
	const unc = title.match(new RegExp(String.raw`(\\\\[^:*?"<>|]+\.(?:${VIDEO_EXT}))`, "i"));
	if (unc?.[1]) {
		return unc[1];
	}
	const posix = title.match(new RegExp(String.raw`(/(?:[^:*?"<>|\n]+\.(?:${VIDEO_EXT})))`, "i"));
	return posix?.[1] ?? null;
}

function parseRows(raw: string): WindowRow[] {
	const trimmed = raw.trim();
	if (!trimmed) {
		return [];
	}
	try {
		const parsed: unknown = JSON.parse(trimmed);
		const rows = Array.isArray(parsed) ? parsed : [parsed];
		return rows.flatMap((row) => {
			if (!row || typeof row !== "object") {
				return [];
			}
			const record = row as Record<string, unknown>;
			const name = record.name ?? record.ProcessName;
			const title = record.title ?? record.MainWindowTitle;
			const windowId = record.windowId ?? record.MainWindowHandle;
			if (typeof name !== "string" || typeof title !== "string" || !title) {
				return [];
			}
			return [
				{
					name,
					title,
					windowId: String(windowId ?? ""),
					foreground: record.foreground === true,
				},
			];
		});
	} catch {
		return [];
	}
}

function isAllowedRow(row: WindowRow, settings: AppSettings): boolean {
	if (settings.enableMediaPlayerDetection) {
		if (matchMediaPlayerId(row.name, settings.enabledMediaPlayers)) {
			return true;
		}
	}
	if (settings.enableStreamingDetection) {
		if (matchStreamingProviderId(row.name, row.title, settings.enabledStreamingProviders)) {
			return true;
		}
	}
	return false;
}

export async function getNowPlayingMedia(settings: AppSettings, preferredWindowId?: string): Promise<NowPlayingMedia | null> {
	if (process.platform !== "win32") {
		return null;
	}
	if (!settings.enableMediaPlayerDetection && !settings.enableStreamingDetection) {
		return null;
	}

	const script = [
		"$ErrorActionPreference = 'SilentlyContinue'",
		"[Console]::OutputEncoding = [Text.UTF8Encoding]::new()",
		'Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public static class Fg { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid); }\'',
		"$fg = [Fg]::GetForegroundWindow(); $fgPid = 0; [void][Fg]::GetWindowThreadProcessId($fg, [ref]$fgPid)",
		"Get-Process | Where-Object { $_.MainWindowTitle } | ForEach-Object { [pscustomobject]@{ name = $_.ProcessName; title = $_.MainWindowTitle; windowId = $_.MainWindowHandle.ToString(); foreground = ($_.Id -eq $fgPid) } } | ConvertTo-Json -Compress",
	].join("; ");

	const stdout = await new Promise<string>((resolve, reject) => {
		const proc = spawn("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true });
		let out = "";
		const timeout = setTimeout(() => {
			proc.kill();
		}, 8000);
		proc.stdout.on("data", (chunk: Buffer) => {
			out += chunk.toString("utf8");
		});
		proc.on("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});
		proc.on("close", () => {
			clearTimeout(timeout);
			resolve(out);
		});
	});

	const rows = parseRows(stdout).filter((row) => isAllowedRow(row, settings));
	const preferred = preferredWindowId ? rows.find((row) => row.windowId === preferredWindowId) : undefined;
	const localHit = rows.find((row) => settings.enableMediaPlayerDetection && Boolean(matchMediaPlayerId(row.name, settings.enabledMediaPlayers)));
	const hit = preferred ?? localHit ?? rows.find((row) => isAllowedRow(row, settings));
	if (!hit) {
		return null;
	}

	return {
		player: processKey(hit.name),
		windowId: hit.windowId,
		title: hit.title,
		filePath: isBrowserProcess(hit.name) ? null : extractFilePath(hit.title),
		url: null,
		foreground: hit.foreground,
	};
}
