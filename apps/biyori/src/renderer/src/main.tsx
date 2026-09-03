import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ParentWindowScrim } from "@/components/parent-window-scrim";
import "./index.css";
import { rendererRoutePath } from "./lib/start-path";
import { initTheme } from "./lib/theme";
import { router } from "./router";
import { TrpcProvider } from "./trpc-provider";

initTheme();

const splash = rendererRoutePath().includes("/splash");

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<TrpcProvider>
			<div className='relative flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
				<RouterProvider router={router} />
				{splash ? null : <ParentWindowScrim />}
			</div>
		</TrpcProvider>
	</StrictMode>,
);
