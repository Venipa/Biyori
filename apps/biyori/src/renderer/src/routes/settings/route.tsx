import { desktopRpc } from "@/desktop-rpc";
import {
  type AppSettings,
  type AppSettingsInput,
  type AppSettingsPatch,
  appSettingsDefaultValues,
  appSettingsSchema,
} from "@/lib/schemas/app-settings";
import { Button } from "@/mainview/components/ui/button";
import { FieldError } from "@/mainview/components/ui/field";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import {
  settingsFieldSection,
  settingsSections,
} from "@/mainview/lib/settings-nav";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { type FieldErrors, type FieldPath, FormProvider, useForm } from "react-hook-form";

export const Route = createFileRoute("/settings")({
	beforeLoad: ({ location }) => {
		if (location.pathname === "/settings" || location.pathname === "/settings/") {
			throw redirect({ to: "/settings/services" });
		}
	},
	component: SettingsLayout,
});

function firstErrorPath(errors: FieldErrors): string | null {
	for (const [key, value] of Object.entries(errors)) {
		if (!value || key === "root") {
			continue;
		}
		if (
			typeof value === "object" &&
			"message" in value &&
			value.message &&
			"type" in value
		) {
			return key;
		}
		if (typeof value === "object") {
			const nested = firstErrorPath(value as FieldErrors);
			if (nested) {
				return `${key}.${nested}`;
			}
		}
	}
	return null;
}

function pickDirty(
	values: AppSettings,
	dirty: object,
): AppSettingsPatch {
	const patch: Record<string, unknown> = {};
	for (const [key, flag] of Object.entries(dirty)) {
		if (!flag) {
			continue;
		}
		const value = values[key as keyof AppSettings];
		if (flag === true || Array.isArray(value)) {
			patch[key] = value;
		}
	}
	return patch;
}

function SettingsLayout() {
	const query = trpc.settings.get.useQuery();
	if (query.isPending && !query.data) {
		return (
			<SettingsChrome
				footer={
					<div className="flex items-center justify-end gap-2 border-t bg-muted/50 px-4 py-3">
						<Button
							variant="outline"
							type="button"
							onClick={() => {
								void desktopRpc.request.closeSettings({});
							}}
						>
							Cancel
						</Button>
						<Button type="button" disabled>
							OK
						</Button>
					</div>
				}
			>
				<div className="flex flex-col gap-3 p-4">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			</SettingsChrome>
		);
	}
	return (
		<SettingsForm
			key={query.dataUpdatedAt}
			defaultValues={query.data ?? appSettingsDefaultValues}
		/>
	);
}

function SettingsChrome({
	children,
	footer,
}: {
	children: ReactNode;
	footer: ReactNode;
}) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const active = settingsSections.find((section) =>
		pathname.endsWith(`/${section.id}`),
	);

	return (
		<div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<ScrollArea className="h-full w-40 shrink-0 border-r bg-muted/40">
					<nav aria-label="Settings sections" className="flex flex-col gap-0.5 p-2">
						{settingsSections.map((item) => {
							const href = `/settings/${item.id}`;
							const isActive = pathname === href;
							return (
								<Link
									key={item.id}
									to={href}
									aria-current={isActive ? "page" : undefined}
									className={cn(
										"flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
										isActive
											? "bg-accent text-accent-foreground"
											: "text-foreground/80 hover:bg-muted",
									)}
								>
									<item.icon className="size-4 shrink-0" />
									<span className="truncate">{item.label}</span>
								</Link>
							);
						})}
					</nav>
				</ScrollArea>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
					<div className="border-b bg-muted px-4 py-2">
						<h2 className="text-sm font-semibold text-foreground/90">
							{active?.label ?? "Settings"}
						</h2>
					</div>
					<ScrollArea className="min-h-0 flex-1" viewportClassName="pb-20">
						{children}
					</ScrollArea>
				</div>
			</div>
			{footer}
		</div>
	);
}

function SettingsForm({
	defaultValues,
}: {
	defaultValues: AppSettingsInput | AppSettings;
}) {
	const navigate = useNavigate();
	const saveSettings = trpc.settings.set.useMutation();
	const form = useForm<AppSettingsInput, unknown, AppSettings>({
		resolver: zodResolver(appSettingsSchema),
		defaultValues,
		shouldUnregister: false,
	});

	return (
		<FormProvider {...form}>
			<SettingsChrome
				footer={
					<div className="flex items-center justify-end gap-2 border-t bg-muted/50 px-4 py-3">
						<FieldError errors={[form.formState.errors.root?.serverError]} />
						<Button
							variant="outline"
							type="button"
							onClick={() => {
								void desktopRpc.request.closeSettings({});
							}}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={form.formState.isSubmitting}
							onClick={() => {
								void form.handleSubmit(
									async (data) => {
										try {
											const patch = pickDirty(
												data,
												form.formState.dirtyFields,
											);
											if (Object.keys(patch).length === 0) {
												await desktopRpc.request.closeSettings({});
												return;
											}
											const saved = await saveSettings.mutateAsync(patch);
											form.reset(saved);
											await desktopRpc.request.closeSettings({});
										} catch (error) {
											form.setError("root.serverError", {
												message:
													error instanceof Error
														? error.message
														: "Could not save settings",
											});
										}
									},
									(errors) => {
										const path = firstErrorPath(errors);
										const rootKey = path?.split(".")[0] ?? "";
										const section =
											settingsFieldSection[rootKey] ?? "application";
										void navigate({ to: `/settings/${section}` });
										if (path) {
											void form.setFocus(path as FieldPath<AppSettingsInput>);
										}
										form.setError("root.serverError", {
											message: path
												? `Fix ${path} in ${section}`
												: "Fix invalid settings",
										});
									},
								)();
							}}
						>
							OK
						</Button>
					</div>
				}
			>
				<div className="p-4">
					<Outlet />
				</div>
			</SettingsChrome>
		</FormProvider>
	);
}
