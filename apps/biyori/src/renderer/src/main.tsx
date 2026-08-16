import { AppTitleBar } from "@/components/app-titlebar";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { initTheme } from "./lib/theme";
import { router } from "./router";
import { TrpcProvider } from "./trpc-provider";

initTheme();

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<TrpcProvider>
      <AppTitleBar title="Biyori" />
			<RouterProvider router={router} />
		</TrpcProvider>
	</StrictMode>,
);
