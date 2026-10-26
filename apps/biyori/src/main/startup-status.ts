export type StartupStepState = "active" | "done" | "error";

export type StartupStep = {
	id: string;
	label: string;
	state: StartupStepState;
	detail?: string;
	/** 0..1 within the step, when known */
	progress?: number;
};

type Listener = (steps: StartupStep[]) => void;

const steps = new Map<string, StartupStep>();
const listeners = new Set<Listener>();

function emit(): void {
	const next = startupSnapshot();
	for (const listener of listeners) {
		listener(next);
	}
}

export function startupSnapshot(): StartupStep[] {
	return [...steps.values()];
}

export function beginStep(id: string, label: string, detail?: string): void {
	steps.set(id, { id, label, state: "active", detail });
	emit();
}

export function updateStep(id: string, patch: Partial<Pick<StartupStep, "label" | "detail" | "progress">>): void {
	const step = steps.get(id);
	if (!step) {
		return;
	}
	steps.set(id, { ...step, ...patch });
	emit();
}

export function endStep(id: string, state: Exclude<StartupStepState, "active"> = "done", detail?: string): void {
	const step = steps.get(id);
	if (!step) {
		return;
	}
	steps.set(id, { ...step, state, detail: detail ?? (state === "done" ? undefined : step.detail), progress: undefined });
	emit();
}

/** Fails whichever step is still running, e.g. when boot throws. */
export function failActiveSteps(detail: string): void {
	for (const step of steps.values()) {
		if (step.state === "active") {
			endStep(step.id, "error", detail);
		}
	}
}

export function subscribeStartup(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function resetStartupSteps(): void {
	steps.clear();
}
