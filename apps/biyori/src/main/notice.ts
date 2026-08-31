import { Notification } from "electron";

export type AppNotice = {
	message: string;
	at: number;
	busy: boolean;
};

type NoticeListener = (notice: AppNotice) => void;

let notice: AppNotice = { message: "", at: 0, busy: false };
const listeners = new Set<NoticeListener>();

export function getAppNotice(): AppNotice {
	return notice;
}

export function setAppNotice(message: string, options?: { toast?: boolean; busy?: boolean }): void {
	const toast = options?.toast ?? true;
	notice = {
		message,
		at: Date.now(),
		busy: Boolean(message) && Boolean(options?.busy),
	};
	for (const listener of listeners) {
		listener(notice);
	}
	if (toast && message) {
		new Notification({
			title: "Biyori",
			body: message,
		}).show();
	}
}

export function subscribeAppNotice(listener: NoticeListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
