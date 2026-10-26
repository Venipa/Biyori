import { existsSync } from "node:fs";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { type AuthEvent, subscribeAuthEvents } from "../accounts/auth-events";
import { getAnilistLoginError } from "../anilist/oauth";
import { clearAnilistAuth, readAnilistAuth, toPublicStatus } from "../anilist/store";
import { activeService, serviceDatabasePath } from "../lib/app-paths";
import { getMalLoginError } from "../mal/connect";
import { isMalConfigured, openMalLogin } from "../mal/oauth";
import { readMalAuth } from "../mal/store";
import { type AccountService, accountKey, credentialsStore } from "../stores";
import { abortAniListSync } from "../sync";
import { t as trpc } from "../trpc";

/** Service-neutral view of whichever list account is active. */
export const accountRouter = trpc.router({
	status: trpc.procedure.query(() => {
		const mal = readMalAuth();
		if (mal) {
			return {
				service: "myanimelist" as const,
				connected: true,
				username: mal.username,
				avatarUrl: mal.avatarUrl || null,
				loginError: getMalLoginError(),
				malAvailable: isMalConfigured(),
			};
		}
		const anilist = toPublicStatus(readAnilistAuth());
		return {
			service: "anilist" as const,
			connected: anilist.connected,
			username: anilist.username,
			avatarUrl: anilist.avatarUrl,
			loginError: getMalLoginError() ?? getAnilistLoginError(),
			malAvailable: isMalConfigured(),
		};
	}),
	connectMal: trpc.procedure.mutation(() => {
		if (!isMalConfigured()) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "VITE_MAL_CLIENT_ID is not set" });
		}
		openMalLogin();
		return { opened: true as const };
	}),
	/** Accounts that have a DB on disk (statistics scope picker); the active one first. */
	list: trpc.procedure.query(() => {
		const active = activeService();
		const tokens = credentialsStore.get("tokens") ?? {};
		const accounts = Object.entries(tokens).flatMap(([key, token]) => {
			const [service, id] = key.split(":");
			if ((service !== "anilist" && service !== "myanimelist") || !existsSync(serviceDatabasePath(service))) {
				return [];
			}
			return [{ service: service as AccountService, id: Number(id), username: token.username ?? "", active: service === active }];
		});
		// one DB per service: keep the account currently pointed at for each service
		const current = credentialsStore.get("activeAccount");
		const byService = new Map(accounts.map((account) => [account.service, account]));
		for (const account of accounts) {
			if (current && account.service === current.service && account.id === current.id) {
				byService.set(account.service, account);
			}
		}
		return [...byService.values()].toSorted((left, right) => Number(right.active) - Number(left.active));
	}),
	onAuth: trpc.procedure.subscription(() => observable<AuthEvent>((emit) => subscribeAuthEvents((event) => emit.next(event)))),
	disconnect: trpc.procedure.mutation(() => {
		abortAniListSync();
		const active = credentialsStore.get("activeAccount");
		if (active?.service === "myanimelist") {
			const tokens = { ...credentialsStore.get("tokens") };
			delete tokens[accountKey(active)];
			credentialsStore.set("tokens", tokens);
			credentialsStore.set("activeAccount", null);
		} else {
			clearAnilistAuth();
		}
		return { ok: true as const };
	}),
});
