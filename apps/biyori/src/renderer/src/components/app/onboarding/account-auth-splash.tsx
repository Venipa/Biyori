import { useTranslation } from "@biyori/translations/react";
import { useEffect, useState } from "react";
import { type AccountService, serviceLabel } from "@/mainview/components/app/shell/account-avatar";
import Logo from "@/mainview/components/app/shell/logo";
import { Button } from "@/mainview/components/ui/button";
import { Spinner } from "@/mainview/components/ui/spinner";
import { trpc } from "@/mainview/trpc";

const HIDE_MS = 1800;

type AuthEvent =
	| { phase: "loading"; service: AccountService }
	| { phase: "success"; service: AccountService; username: string }
	| { phase: "error"; service: AccountService; message: string };

/** Full-window overlay while a login callback (deep link) is processed. */
export function AccountAuthSplash() {
	const { t } = useTranslation();
	const [event, setEvent] = useState<AuthEvent | null>(null);
	const utils = trpc.useUtils();
	const authorizeAnilist = trpc.anilist.authorize.useMutation();
	const connectMal = trpc.account.connectMal.useMutation();
	trpc.account.onAuth.useSubscription(undefined, {
		onData: (next) => {
			setEvent(next);
			if (next.phase !== "loading") {
				void utils.anilist.status.invalidate();
				void utils.account.status.invalidate();
			}
		},
	});

	useEffect(() => {
		if (event?.phase !== "success") {
			return;
		}
		const timer = window.setTimeout(() => {
			setEvent(null);
		}, HIDE_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [event]);

	if (!event) {
		return null;
	}
	const service = serviceLabel(event.service);

	function retry(): void {
		if (!event) {
			return;
		}
		setEvent(null);
		if (event.service === "myanimelist") {
			void connectMal.mutateAsync();
		} else {
			void authorizeAnilist.mutateAsync();
		}
	}

	return (
		<div role='status' aria-live='polite' className='absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background px-8'>
			<Logo className='size-14' />
			{event.phase === "loading" ? (
				<div className='flex items-center gap-2 text-sm text-muted-foreground'>
					<Spinner size='sm' />
					{t("onboarding.signingIn", { service })}
				</div>
			) : null}
			{event.phase === "success" ? <p className='text-center text-sm'>{t("onboarding.connectedAs", { name: event.username || service })}</p> : null}
			{event.phase === "error" ? (
				<>
					<div className='flex max-w-sm flex-col items-center gap-1 text-center'>
						<p className='text-sm font-medium'>{t("onboarding.connectFailed", { service })}</p>
						<p className='text-sm text-muted-foreground'>{event.message}</p>
					</div>
					<div className='flex gap-2'>
						<Button
							type='button'
							variant='outline'
							onClick={() => {
								setEvent(null);
							}}>
							{t("common.close")}
						</Button>
						<Button type='button' onClick={retry}>
							{t("common.retry")}
						</Button>
					</div>
				</>
			) : null}
		</div>
	);
}
