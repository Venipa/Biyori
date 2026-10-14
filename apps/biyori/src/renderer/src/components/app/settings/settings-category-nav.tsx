import { t } from "@biyori/translations/react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/mainview/components/ui/button";
import { cn } from "@/mainview/lib/utils";

const pillSpring = { type: "spring", stiffness: 420, damping: 32 } as const;

export type SettingsCategoryNavItem = {
	id: string;
	label: string;
};

type SettingsCategoryNavProps = {
	items: readonly SettingsCategoryNavItem[];
	value: string;
	onValueChange: (id: string) => void;
	"aria-label": string;
};

function measureOverflow(el: HTMLElement): { left: boolean; right: boolean } {
	const max = el.scrollWidth - el.clientWidth;
	return { left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 };
}

export function SettingsCategoryNav({ items, value, onValueChange, "aria-label": ariaLabel }: SettingsCategoryNavProps) {
	const scrollerRef = useRef<HTMLDivElement>(null);
	const [overflow, setOverflow] = useState({ left: false, right: false });

	useLayoutEffect(() => {
		const el = scrollerRef.current;
		if (!el) {
			return;
		}
		const update = () => {
			setOverflow(measureOverflow(el));
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(el);
		el.addEventListener("scroll", update, { passive: true });
		return () => {
			observer.disconnect();
			el.removeEventListener("scroll", update);
		};
	}, []);

	useLayoutEffect(() => {
		const root = scrollerRef.current;
		const tab = root?.querySelector(`[data-card="${CSS.escape(value)}"]`);
		if (!root || !(tab instanceof HTMLElement)) {
			return;
		}
		const tabBox = tab.getBoundingClientRect();
		const rootBox = root.getBoundingClientRect();
		if (tabBox.left < rootBox.left) {
			root.scrollBy({ left: tabBox.left - rootBox.left - 8, behavior: "smooth" });
			return;
		}
		if (tabBox.right > rootBox.right) {
			root.scrollBy({ left: tabBox.right - rootBox.right + 8, behavior: "smooth" });
		}
	}, [value]);

	return (
		<div className='flex min-w-0 items-stretch gap-1'>
			<Button
				type='button'
				variant='ghost'
				size='icon-xs'
				className='my-auto shrink-0'
				disabled={!overflow.left}
				aria-label={t("settings.nav.scrollLeft")}
				onClick={() => {
					scrollerRef.current?.scrollBy({ left: -160, behavior: "smooth" });
				}}>
				<ChevronLeftIcon />
			</Button>
			<LayoutGroup id='settings-category-nav'>
				<nav aria-label={ariaLabel} className='relative min-w-0 flex-1'>
					<div ref={scrollerRef} className='flex min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
						{items.map((item) => {
							const isActive = item.id === value;
							return (
								<button
									key={item.id}
									type='button'
									aria-current={isActive ? "true" : undefined}
									className={cn("relative shrink-0 px-3 py-2 text-sm font-medium transition-colors", isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
									data-card={item.id}
									onClick={() => {
										onValueChange(item.id);
									}}>
									{isActive ? <motion.span layoutId='pill' aria-hidden className='absolute inset-x-1 inset-y-1 rounded-md bg-muted' transition={pillSpring} /> : null}
									<span className='relative z-10 truncate'>{item.label}</span>
								</button>
							);
						})}
					</div>
				</nav>
			</LayoutGroup>
			<Button
				type='button'
				variant='ghost'
				size='icon-xs'
				className='my-auto shrink-0'
				disabled={!overflow.right}
				aria-label={t("settings.nav.scrollRight")}
				onClick={() => {
					scrollerRef.current?.scrollBy({ left: 160, behavior: "smooth" });
				}}>
				<ChevronRightIcon />
			</Button>
		</div>
	);
}
