import { type SettingsFormInput, type SettingsFormValues, settingsFormSchema } from "@/lib/schemas/app-settings";
import { PageLoad } from "@/mainview/components/page-load";
import { SettingsCloseGuard } from "@/mainview/components/settings/settings-close-guard";
import { SettingsSaveBar } from "@/mainview/components/settings/settings-save-bar";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { matchSettingsNav, settingsSectionHref, settingsSections } from "@/mainview/lib/settings-nav";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutGroup, motion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

export const Route = createFileRoute("/settings")({
	component: SettingsLayout,
});

function SettingsLayout() {
	const settingsQuery = trpc.settings.get.useQuery();
	return <PageLoad loading={!settingsQuery.data}>{settingsQuery.data ? <SettingsForm defaultValues={settingsQuery.data} /> : null}</PageLoad>;
}

function navLinkClass(isActive: boolean) {
	return cn(
		"flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
		isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-muted",
	);
}

function subNavLinkClass(isActive: boolean) {
	return cn(
		"relative flex items-center py-1.5 pl-3 text-left text-sm transition-colors",
		isActive ? "text-foreground" : "text-foreground/80 hover:text-foreground",
	);
}

const subNavPillSpring = { type: "spring", stiffness: 420, damping: 32 } as const;
const subNavPillEnter = { duration: 0.18, ease: [0.16, 1, 0.3, 1] } as const;
const subNavPillInstant = { duration: 0 } as const;

function SettingsSubNav({
	sectionId,
	items,
	pathname,
}: {
	sectionId: string;
	items: readonly { id: string; label: string }[];
	pathname: string;
}) {
	const groupActive = items.some((child) => pathname === settingsSectionHref(sectionId, child.id));
	const shown = useRef(false);
	if (!groupActive) {
		shown.current = false;
	}
	const isEnter = groupActive && !shown.current;
	if (groupActive) {
		shown.current = true;
	}

	return (
		<LayoutGroup id={`settings-sub-${sectionId}`}>
			<div className='relative ml-3 flex flex-col border-l border-border'>
				{items.map((child) => {
					const href = settingsSectionHref(sectionId, child.id);
					const isActive = pathname === href;
					return (
						<Link key={child.id} to={href} aria-current={isActive ? "page" : undefined} className={subNavLinkClass(isActive)}>
							{isActive ? (
								<motion.span
									layoutId='pill'
									aria-hidden
									className='absolute top-1/2 left-0 h-3.5 w-1 rounded-full bg-primary'
									initial={isEnter ? { opacity: 0, scale: 0.5, x: "-50%", y: "-50%" } : false}
									animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
									transition={{
										layout: subNavPillSpring,
										opacity: isEnter ? subNavPillEnter : subNavPillInstant,
										scale: isEnter ? subNavPillEnter : subNavPillInstant,
									}}
								/>
							) : null}
							<span className='truncate'>{child.label}</span>
						</Link>
					);
				})}
			</div>
		</LayoutGroup>
	);
}

function SettingsChrome({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const { section: active, child: activeChild } = matchSettingsNav(pathname);
	const heading = activeChild ?? active;

	return (
		<div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground'>
			<div className='flex min-h-0 flex-1 gap-0 overflow-hidden'>
				<ScrollArea className='h-full w-48 shrink-0 bg-card/20 border-r'>
					<nav aria-label='Settings sections' className='flex flex-col gap-1 p-2'>
						{settingsSections.map((item) => {
							const children = "children" in item ? item.children : undefined;
							if (children?.length) {
								const firstHref = settingsSectionHref(item.id, children[0].id);
								const groupActive = active?.id === item.id;
								return (
									<div key={item.id} className='flex flex-col gap-0.5'>
										<Link to={firstHref} className={navLinkClass(groupActive)}>
											<item.icon className='size-4 shrink-0' />
											<span className='truncate'>{item.label}</span>
										</Link>
										<SettingsSubNav sectionId={item.id} items={children} pathname={pathname} />
									</div>
								);
							}
							const href = settingsSectionHref(item.id);
							const isActive = pathname === href;
							return (
								<Link key={item.id} to={href} aria-current={isActive ? "page" : undefined} className={navLinkClass(isActive)}>
									<item.icon className='size-4 shrink-0' />
									<span className='truncate'>{item.label}</span>
								</Link>
							);
						})}
					</nav>
				</ScrollArea>
				<div className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/30'>
					<ScrollArea className='min-h-0 flex-1' viewportClassName='rounded-none pb-20'>
						<div className='sticky top-0 z-10 flex flex-col gap-0.5 border-b bg-card/80 px-4 py-3 backdrop-blur-md'>
							<h2 className='text-lg font-semibold tracking-tight'>{heading?.label ?? "Settings"}</h2>
							{heading?.description ? <p className='text-sm text-muted-foreground'>{heading.description}</p> : null}
						</div>
						<div className='flex flex-col gap-4 p-4'>{children}</div>
					</ScrollArea>
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
			<SettingsChrome
				overlay={
					<>
						<SettingsSaveBar />
						<SettingsCloseGuard />
					</>
				}>
				<Outlet />
			</SettingsChrome>
		</FormProvider>
	);
}
