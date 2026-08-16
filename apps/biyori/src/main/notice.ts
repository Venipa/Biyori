import { Notification } from "electron";

export type AppNotice = {
	message: string;
	at: number;
};

type NoticeListener = (notice: AppNotice) => void;

let notice: AppNotice = { message: "", at: 0 };
const listeners = new Set<NoticeListener>();

export function getAppNotice(): AppNotice {
	return notice;
}

export function setAppNotice(message: string): void {
	notice = { message, at: Date.now() };
	for (const listener of listeners) {
		listener(notice);
	}
	if (message) {
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
