import { WindowManager } from "./windows/manager";

export const windowManager = new WindowManager({
	main: {
		title: "Biyori",
		width: 1200,
		height: 960,
		minWidth: 680,
		minHeight: 520,
		saveState: true,
	},
	settings: {
		title: "Settings",
		width: 760,
		height: 680,
		minWidth: 600,
		minHeight: 400,
		to: "/settings/services",
		alwaysOnTop: true,
	},
	update: {
		title: "Update",
		width: 480,
		height: 360,
		minWidth: 400,
		minHeight: 300,
		to: "/update",
		alwaysOnTop: true,
		singleton: true,
	},
});
