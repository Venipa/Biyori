import { log } from "@biyori/logger";
import { requestAppRelaunch } from "../handlers/quit-handler";
import { type AccountRef, accountKey, credentialsStore } from "../stores";

/**
 * Call after a login wrote `ref`'s tokens. First account activates in place;
 * a different one keeps the old account active and relaunches into the switch.
 */
export function activateAccount(ref: AccountRef, previous: AccountRef | null | undefined): "active" | "relaunching" {
	if (!previous || accountKey(previous) === accountKey(ref)) {
		credentialsStore.set("activeAccount", ref);
		return "active";
	}
	credentialsStore.set("activeAccount", previous);
	credentialsStore.set("pendingAccount", ref);
	void requestAppRelaunch();
	return "relaunching";
}

/**
 * Runs before the DB opens: the active account picks the DB file, so a pending switch
 * only flips the pointer. Each service keeps its own DB and queue; tokens stay for switching back.
 */
export function applyPendingAccountSwitch(): void {
	const pending = credentialsStore.get("pendingAccount");
	if (!pending) {
		return;
	}
	const active = credentialsStore.get("activeAccount");
	log.info("switching account", { from: active ? accountKey(active) : null, to: accountKey(pending) });
	credentialsStore.set("activeAccount", pending);
	credentialsStore.set("pendingAccount", null);
}
