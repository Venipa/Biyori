import { XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/mainview/components/ui/dropdown-menu";
import { FilterPillButton } from "@/mainview/components/ui/filter-pill-button";

const removeTransition = { duration: 0.18, ease: [0.16, 1, 0.3, 1] } as const;

export function ListFilterChip({ label, value, onRemove, children, size = "xs" }: { label: string; value: string; onRemove: () => void; children: ReactNode; size?: "xs" | "sm" }) {
	const [hovered, setHovered] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const showRemove = hovered || menuOpen;
	const iconSize = size === "sm" ? "icon-sm" : "icon-xs";
	const slotPx = size === "sm" ? 30 : 26;

	return (
		<DropdownMenu onOpenChange={setMenuOpen}>
			<div
				className='relative inline-flex items-center'
				onPointerEnter={() => {
					setHovered(true);
				}}
				onPointerLeave={() => {
					setHovered(false);
				}}
				onFocus={() => {
					setHovered(true);
				}}
				onBlur={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
						setHovered(false);
					}
				}}>
				<DropdownMenuTrigger render={<FilterPillButton size={size} className='relative z-10' />}>
					<span className='text-muted-foreground'>{label}</span>
					<span className='min-w-0 truncate'>{value}</span>
				</DropdownMenuTrigger>
				<AnimatePresence>
					{showRemove ? (
						<motion.div
							key='remove'
							className='relative z-0 overflow-hidden'
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: slotPx, opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							transition={removeTransition}>
							<div className='flex justify-end pl-0.5'>
								<FilterPillButton
									size={iconSize}
									aria-label={`Remove ${label} filter`}
									onClick={() => {
										window.setTimeout(onRemove, 0);
									}}>
									<XIcon />
								</FilterPillButton>
							</div>
						</motion.div>
					) : null}
				</AnimatePresence>
			</div>
			<DropdownMenuContent align='start' className='min-w-52 overflow-hidden p-0'>
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
