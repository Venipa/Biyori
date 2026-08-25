import { t } from "../trpc";
import { applyAppUpdate, checkForAppUpdate, downloadAppUpdate, getUpdateState, refreshLocalUpdateInfo, updateStateObservable } from "../updater";

export const updaterRouter = t.router({
	status: t.procedure.query(() => getUpdateState()),
	local: t.procedure.query(async () => {
		return refreshLocalUpdateInfo();
	}),
	onStatus: t.procedure.subscription(() => updateStateObservable()),
	check: t.procedure.mutation(async () => {
		return checkForAppUpdate();
	}),
	download: t.procedure.mutation(() => {
		void downloadAppUpdate();
		return getUpdateState();
	}),
	restartAndApply: t.procedure.mutation(async () => {
		await applyAppUpdate();
		return { ok: true as const };
	}),
});
