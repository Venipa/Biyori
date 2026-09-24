"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import { Children, isValidElement, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

const view = { once: true, amount: "some" } as const;

const MotionDl = motion.create("dl");

function useMotionOff(): boolean {
	return useReducedMotion() === true;
}

function settleTransition(off: boolean, delay: number): Transition {
	return { duration: off ? 0 : 0.55, delay: off ? 0 : delay, ease: EASE };
}

export function Settle({ children, className, delay = 0, from = "y" }: { children: ReactNode; className?: string; delay?: number; from?: "x" | "y" }) {
	const off = useMotionOff();

	return (
		<motion.div
			className={className}
			initial={false}
			animate={off ? { x: 0, y: 0, filter: "blur(0px)" } : from === "x" ? { x: [18, 0], filter: "blur(0px)" } : { y: [16, 0], filter: ["blur(6px)", "blur(0px)"] }}
			transition={settleTransition(off, delay)}>
			{children}
		</motion.div>
	);
}

export function RevealFrame({ children, className }: { children: ReactNode; className?: string }) {
	const off = useMotionOff();

	return (
		<motion.div
			className={className}
			initial={false}
			whileInView={off ? { clipPath: "inset(0% round 16px)" } : { clipPath: ["inset(8% 0% 12% 0% round 16px)", "inset(0% round 16px)"] }}
			viewport={view}
			transition={{ duration: off ? 0 : 0.7, ease: EASE }}>
			{children}
		</motion.div>
	);
}

export function RevealBlock({ children, className }: { children: ReactNode; className?: string }) {
	const off = useMotionOff();

	return (
		<motion.div className={className} initial={false} whileInView={off ? { y: 0 } : { y: [14, 0] }} viewport={view} transition={{ duration: off ? 0 : 0.5, ease: EASE }}>
			{children}
		</motion.div>
	);
}

const itemVariants = {
	show: {
		y: [12, 0],
		filter: ["blur(4px)", "blur(0px)"],
		transition: { duration: 0.45, ease: EASE },
	},
};

export function RevealList({ as = "div", children, className }: { as?: "div" | "dl"; children: ReactNode; className?: string }) {
	const off = useMotionOff();
	const items = Children.toArray(children);
	const Tag = as === "dl" ? MotionDl : motion.div;

	return (
		<Tag
			className={className}
			initial={false}
			whileInView={off ? undefined : "show"}
			viewport={view}
			variants={off ? undefined : { show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }}>
			{items.map((child, index) => (
				<motion.div key={isValidElement(child) && child.key != null ? String(child.key) : index} variants={off ? undefined : itemVariants}>
					{child}
				</motion.div>
			))}
		</Tag>
	);
}
