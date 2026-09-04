export function formatSentryRelease(version: string, gitHash: string | undefined): string {
	const short = gitHash?.slice(0, 7);
	return short ? `biyori@${version}+${short}` : `biyori@${version}`;
}

export function sentryClientEnabled(isPackaged: boolean, sendCrashReports: boolean): boolean {
	return isPackaged && sendCrashReports;
}
