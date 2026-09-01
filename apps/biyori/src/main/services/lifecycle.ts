import { logger as log } from "@biyori/logger";

export type LifecycleFn = () => void | Promise<void>;
export type LifecyclePhase = "beforeLoad" | "onInit" | "afterInit";

export class AppLifecycle {
	private readonly hooks: Record<LifecyclePhase, LifecycleFn[]> = {
		beforeLoad: [],
		onInit: [],
		afterInit: [],
	};

	beforeLoad(fn: LifecycleFn): () => void {
		return this.add("beforeLoad", fn);
	}

	onInit(fn: LifecycleFn): () => void {
		return this.add("onInit", fn);
	}

	afterInit(fn: LifecycleFn): () => void {
		return this.add("afterInit", fn);
	}

	async run(phase: LifecyclePhase): Promise<void> {
		const list = [...this.hooks[phase]];
		if (phase === "afterInit") {
			for (const fn of list) {
				try {
					await fn();
				} catch (error) {
					log.error("[afterInit]", error);
				}
			}
			return;
		}
		for (const fn of list) {
			await fn();
		}
	}

	private add(phase: LifecyclePhase, fn: LifecycleFn): () => void {
		this.hooks[phase].push(fn);
		return () => {
			this.hooks[phase] = this.hooks[phase].filter((hook) => hook !== fn);
		};
	}
}

export const lifecycle = new AppLifecycle();

export function beforeLoad(fn: LifecycleFn): () => void {
	return lifecycle.beforeLoad(fn);
}

export function onInit(fn: LifecycleFn): () => void {
	return lifecycle.onInit(fn);
}

export function afterInit(fn: LifecycleFn): () => void {
	return lifecycle.afterInit(fn);
}
