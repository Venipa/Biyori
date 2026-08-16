import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/shared/app-router";

export const trpc = createTRPCReact<AppRouter>();
