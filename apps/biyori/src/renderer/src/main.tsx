import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppTitleBar } from "@/components/app-titlebar";
import "./index.css";
import { initTheme } from "./lib/theme";
import { router } from "./router";
import { TrpcProvider } from "./trpc-provider";

initTheme();

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<TrpcProvider>
			<div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
				<AppTitleBar title='Biyori' />
				<div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
					<RouterProvider router={router} />
				</div>
			</div>
		</TrpcProvider>
	</StrictMode>,
);
