import { type SettingsFormInput, type SettingsFormValues, settingsFormSchema } from "@/lib/schemas/app-settings";
import { SettingsSaveBar } from "@/mainview/components/settings/settings-save-bar";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { ipcTrpc } from "@/desktop-rpc";
import { settingsSections } from "@/mainview/lib/settings-nav";
import { cn } from "@/mainview/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";

export const Route = createFileRoute("/settings")({
	loader: () => ipcTrpc.settings.get.query(),
	pendingComponent: SettingsPending,
	component: SettingsLayout,
});

function SettingsPending() {
	return (
		<SettingsChrome>
			<Skeleton className='h-5 w-40' />
			<Skeleton className='h-9 w-full' />
			<Skeleton className='h-9 w-full' />
			<Skeleton className='h-24 w-full' />
		</SettingsChrome>
	);
}

function SettingsLayout() {
	const defaultValues = Route.useLoaderData();
	return <SettingsForm defaultValues={defaultValues} />;
}

function SettingsChrome({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const active = settingsSections.find((section) => pathname.endsWith(`/${section.id}`));

	return (
		<div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground'>
			<div className='flex min-h-0 flex-1 overflow-hidden'>
				<ScrollArea className='h-full w-48 shrink-0 bg-background'>
					<nav aria-label='Settings sections' className='flex flex-col gap-0.5 p-2'>
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
										isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-muted",
									)}>
									<item.icon className='size-4 shrink-0' />
									<span className='truncate'>{item.label}</span>
								</Link>
							);
						})}
					</nav>
				</ScrollArea>
				<div className='relative flex min-h-0 min-w-0 flex-1 flex-col p-3'>
					<div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-muted/30'>
						<div className='flex shrink-0 flex-col gap-0.5 px-4 py-3'>
							<h2 className='text-lg font-semibold tracking-tight'>{active?.label ?? "Settings"}</h2>
							{active?.description ? <p className='text-sm text-muted-foreground'>{active.description}</p> : null}
						</div>
						<ScrollArea className='min-h-0 flex-1' viewportClassName='rounded-none pb-20 pt-1'>
							<div className='flex flex-col gap-4 p-4 pt-0'>{children}</div>
						</ScrollArea>
					</div>
					{overlay}
				</div>
			</div>
		</div>
	);
}

function SettingsForm({ defaultValues }: { defaultValues: SettingsFormInput | SettingsFormValues }) {
	const form = useForm<SettingsFormInput, unknown, SettingsFormValues>({
		resolver: zodResolver(settingsFormSchema),
		defaultValues,
		shouldUnregister: false,
	});

	return (
		<FormProvider {...form}>
			<SettingsChrome overlay={<SettingsSaveBar />}>
				<Outlet />
			</SettingsChrome>
		</FormProvider>
	);
}
