import { WindowManager } from "./windows/manager";

export const windowManager = new WindowManager({
	main: {
		title: "Biyori",
		width: 1200,
		height: 960,
		saveState: true,
	},
	settings: {
		title: "Settings",
		width: 760,
		height: 680,
		to: "/settings/services",
	},
	update: {
		title: "Update",
		width: 480,
		height: 360,
		to: "/update",
	},
});
