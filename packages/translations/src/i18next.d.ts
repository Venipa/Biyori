import "i18next";

declare module "i18next" {
	interface CustomTypeOptions {
		resources: {
			translation: {
				nowPlaying: {
					continueWatching: string;
					olderThan_one: string;
					olderThan_other: string;
					waitingTitle: string;
					waitingDescription: string;
					watchedLastWeek_one: string;
					watchedLastWeek_other: string;
					upcoming: string;
				};
			};
		};
	}
}
