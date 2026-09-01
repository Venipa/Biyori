import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppTitleBar } from "@/components/app-titlebar";
import { ParentWindowScrim } from "@/components/parent-window-scrim";
import "./index.css";
import { initTheme } from "./lib/theme";
import { rendererRoutePath } from "./lib/start-path";
import { router } from "./router";
import { TrpcProvider } from "./trpc-provider";

initTheme();

function windowChromeTitle(): string {
	const path = rendererRoutePath();
	if (path.includes("/settings")) {
		return "Settings";
	}
	if (path.includes("/update")) {
		return "Update";
	}
	return "Biyori";
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<TrpcProvider>
			<div className='relative flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
				<AppTitleBar title={windowChromeTitle()} />
				<div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
					<RouterProvider router={router} />
				</div>
				<ParentWindowScrim />
			</div>
		</TrpcProvider>
	</StrictMode>,
);
