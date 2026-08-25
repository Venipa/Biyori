const INFO_KEY = Buffer.from("4:info");

export function isTorrentPayload(bytes: Buffer): boolean {
	return bytes.length > INFO_KEY.length && bytes[0] === 0x64 && bytes.includes(INFO_KEY);
}
