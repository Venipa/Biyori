import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/mainview/lib/utils";

const saveBarFrameVariants = cva("pointer-events-none absolute inset-x-0 z-10 flex", {
	variants: {
		variant: {
			float: "bottom-4 justify-center px-4",
			docked: "bottom-0 justify-stretch overflow-hidden",
		},
	},
	defaultVariants: {
		variant: "float",
	},
});

const saveBarPanelVariants = cva("pointer-events-auto flex w-full items-center gap-3 border bg-card p-2 pl-3 shadow-lg", {
	variants: {
		variant: {
			float: "max-w-md rounded-xl",
			docked: "max-w-none rounded-t-xl rounded-b-none border-b-0",
		},
	},
	defaultVariants: {
		variant: "float",
	},
});

const saveBarMotion = {
	float: {
		initial: { opacity: 0, scale: 0.96, y: 12 },
		animate: { opacity: 1, scale: 1, y: 0 },
		exit: { opacity: 0, scale: 0.96, y: 12 },
	},
	docked: {
		initial: { opacity: 0, y: "100%" },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: "100%" },
	},
} as const;

const saveBarTransition = { duration: 0.18, ease: [0.16, 1, 0.3, 1] } as const;

type SaveBarVariant = NonNullable<VariantProps<typeof saveBarFrameVariants>["variant"]>;

export function SaveBar({
	open,
	variant = "float",
	children,
	className,
}: {
	open: boolean;
	children: ReactNode;
	className?: string;
	variant?: SaveBarVariant;
}) {
	const motionProps = saveBarMotion[variant];
	return (
		<div className={saveBarFrameVariants({ variant })}>
			<AnimatePresence>
				{open ? (
					<motion.div
						key='save-bar'
						role='status'
						aria-live='polite'
						className={cn(saveBarPanelVariants({ variant }), className)}
						initial={motionProps.initial}
						animate={motionProps.animate}
						exit={motionProps.exit}
						transition={saveBarTransition}>
						{children}
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
