import { resolve } from "node:path";
import styledJsxPlugin from "@rolldown/plugin-styled-jsx";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import type { Plugin, PluginOption, UserConfig } from "vite";
import svgr from "vite-plugin-svgr";

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

export default defineConfig({
	main: {
		...mainResolve,
		build: {
			externalizeDeps: {
				exclude: ["@biyori/electron-trpc", "@biyori/worker"],
			},
		},
	},
	preload: {
		...mainResolve,
		build: {
			externalizeDeps: {
				exclude: ["@biyori/electron-trpc", "@biyori/worker"],
			},
		},
	},
	renderer: {
		...rendererResolve,
		plugins: [
			tanstackRouter({
				target: "react",
				autoCodeSplitting: true,
				routesDirectory: resolve("src/renderer/src/routes"),
				generatedRouteTree: resolve("src/renderer/src/routeTree.gen.ts"),
			}),
      svgr({
        include: "**/*.svg",
        svgrOptions: {}
      }),
			react(),
			tailwindcss(),
			styledJsx(),
		],
	},
});
