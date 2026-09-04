import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import styledJsxPlugin from "@rolldown/plugin-styled-jsx";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import type { Plugin, PluginOption, UserConfig } from "vite";
import svgr from "vite-plugin-svgr";
import { formatSentryRelease } from "./src/shared/sentry-release";

const sharedAliases = {
	"@shared": resolve("src/shared"),
	"@/lib": resolve("src/lib"),
	"@/shared": resolve("src/shared"),
	"@/mainview": resolve("src/renderer/src"),
	"@main": resolve("src/main"),
} as const;

const mainResolve: UserConfig = {
	resolve: {
		alias: {
			...sharedAliases,
			"@": resolve("src/main"),
			"@main": resolve("src/main"),
			"@renderer": resolve("src/renderer/src"),
		},
	},
};

const rendererResolve: UserConfig = {
	resolve: {
		alias: {
			...sharedAliases,
			"@": resolve("src/renderer/src"),
			"@renderer": resolve("src/renderer/src"),
			"@main": resolve("src/main"),
		},
	},
};

function styledJsx(): PluginOption {
	const plugin = styledJsxPlugin() as Plugin;
	const transform = plugin.transform;
	if (transform && typeof transform === "object") {
		transform.filter = {
			id: /\.tsx$/,
			code: { include: /style jsx/ },
		};
	}
	return plugin;
}

function sentryReleaseName(): string {
	const version = JSON.parse(readFileSync(resolve("package.json"), "utf8")).version as string;
	return formatSentryRelease(version, process.env.VITE_APP_GIT_HASH ?? process.env.GITHUB_SHA);
}

function sentryUploadPlugin(): PluginOption {
	const authToken = process.env.SENTRY_AUTH_TOKEN;
	const org = process.env.SENTRY_ORG;
	const project = process.env.SENTRY_PROJECT;
	if (!authToken || !org || !project) {
		return;
	}
	return sentryVitePlugin({
		url: process.env.SENTRY_URL || "https://sentry.venipa.net",
		org,
		project,
		authToken,
		release: { name: sentryReleaseName() },
		sourcemaps: {
			filesToDeleteAfterUpload: ["out/**/*.map"],
		},
		telemetry: false,
	});
}

const sentrySourcemap = process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT ? "hidden" : false;

export default defineConfig({
	main: {
		...mainResolve,
		plugins: [sentryUploadPlugin()],
		build: {
			sourcemap: sentrySourcemap,
			externalizeDeps: {
				include: ["encryption.js", "lodash-es", "@biyori/hana"],
				exclude: ["@biyori/electron-trpc", "@biyori/logger", "@biyori/parser", "@biyori/recognition", "@biyori/worker"],
			},
		},
	},
	preload: {
		...mainResolve,
		plugins: [sentryUploadPlugin()],
		build: {
			sourcemap: sentrySourcemap,
			externalizeDeps: {
				exclude: [
					"@biyori/electron-trpc",
					"@biyori/logger",
					"@biyori/parser",
					"@biyori/recognition",
					"@biyori/worker",
					"@sentry/electron",
				],
			},
		},
	},
	renderer: {
		...rendererResolve,
		build: {
			sourcemap: sentrySourcemap,
		},
		plugins: [
			tanstackRouter({
				target: "react",
				autoCodeSplitting: true,
				routesDirectory: resolve("src/renderer/src/routes"),
				generatedRouteTree: resolve("src/renderer/src/routeTree.gen.ts"),
			}),
			svgr({
				include: ["**/*.svg", "**/*.svg?react"],
				svgrOptions: {},
			}),
			react(),
			tailwindcss(),
			styledJsx(),
			sentryUploadPlugin(),
		],
	},
});
