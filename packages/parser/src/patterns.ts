export const VIDEO_EXT = /^(mkv|mp4|avi|ogm|wmv|flv|ts|m2ts|webm|mov|mpg|mpeg)$/i;

export const RESOLUTION = /^(2160p|1440p|1080p|720p|480p|360p|4k|8k|\d{3,4}x\d{3,4})$/i;

export const VIDEO_TERM =
	/^(x264|x265|h\.?264|h\.?265|hevc|avc|av1|vp9|10bit|8bit|hi10p|hdr10\+?|hdr|sdr|10-bit|8-bit)$/i;

export const SOURCE_TERM =
	/^(web-?dl|webrip|web|bluray|blu-ray|bdrip|bdremux|bd|dvdrip|hdtv|tv)$/i;

export const AUDIO_TERM = /^(aac|flac|opus|mp3|dts|ac3|eac3|truehd|atmos|dual[\s-]?audio)$/i;

export const CRC32 = /^[0-9a-f]{8}$/i;

export const YEAR = /^(19|20)\d{2}$/;

export const VERSION = /^v(\d+)$/i;

export const SEASON_EPISODE =
	/^s(\d{1,2})e(\d{1,4})(?:v(\d+))?(?:[-~]e?(\d{1,4}))?$/i;

export const SEASON_TOKEN = /^s(\d{1,2})$/i;

export const EPISODE_TOKEN = /^e(?:p)?(\d{1,4})(?:v(\d+))?(?:[-~]e?(?:p)?(\d{1,4}))?$/i;

export const EPISODE_RANGE = /^(\d{1,4})(?:v(\d+))?[-~](\d{1,4})(?:v\d+)?$/i;

export const NUMBER_VERSION = /^(\d{1,4})v(\d+)$/i;

export const NTH_SEASON = /^(\d+)(?:st|nd|rd|th)$/i;

export function isSeasonWord(value: string): boolean {
	return /^seasons?$/i.test(value);
}
