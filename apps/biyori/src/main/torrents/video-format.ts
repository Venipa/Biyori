function detectCodec(title: string, term: string | undefined): string {
	const source = `${term ?? ""} ${title}`;
	if (/\b(hevc|x265|h\.?265)\b/i.test(source)) {
		return "HEVC";
	}
	if (/\b(avc|x264|h\.?264)\b/i.test(source)) {
		return "AVC";
	}
	if (/\bav1\b/i.test(source)) {
		return "AV1";
	}
	if (/\bvp9\b/i.test(source)) {
		return "VP9";
	}
	return term?.trim() ?? "";
}

function detectResolution(
	title: string,
	resolution: string | undefined,
): string {
	if (resolution) {
		const pixels = resolution.match(/^(\d+)\s*x\s*(\d+)$/i);
		if (pixels) {
			const height = Number(pixels[2]);
			if (height >= 2160) {
				return "2160p";
			}
			if (height >= 1080) {
				return "1080p";
			}
			if (height >= 720) {
				return "720p";
			}
			if (height >= 480) {
				return "480p";
			}
		}
		return resolution;
	}
	const named = title.match(/\b(2160p|1440p|1080p|720p|480p|360p)\b/i);
	return named ? named[1] : "";
}

export function videoFormat(
	title: string,
	resolution: string | undefined,
	term: string | undefined,
): string {
	return [detectResolution(title, resolution), detectCodec(title, term)]
		.filter(Boolean)
		.join(" ");
}
