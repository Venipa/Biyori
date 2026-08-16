import type { LifecycleFn, LifecyclePhase } from "./lifecycle";

export const kService = Symbol.for("biyori.service");

export class Service {
	readonly [kService] = true as const;
	readonly name: string = this.constructor.name;
	readonly order: number = 100;

	beforeLoad(): void | Promise<void> {}

	onInit(): void | Promise<void> {}

	afterInit(): void | Promise<void> {}
}

export function isService(value: unknown): value is Service {
	return (
		typeof value === "object" &&
		value !== null &&
		kService in value &&
		(value as { [kService]: unknown })[kService] === true
	);
}

export function isServiceClass(value: unknown): value is new () => Service {
	return typeof value === "function" && value.prototype instanceof Service;
}

export function serviceHook(
	service: Service,
	phase: LifecyclePhase,
): LifecycleFn | null {
	const proto = Object.getPrototypeOf(service) as Service | null;
	if (!proto || proto[phase] === Service.prototype[phase]) {
		return null;
	}
	return () => service[phase]();
}
