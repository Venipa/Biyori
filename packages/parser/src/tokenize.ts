export type Token = {
	text: string;
	enclosed: boolean;
	used: boolean;
};

const OPEN: Record<string, string> = {
	"[": "]",
	"(": ")",
	"{": "}",
};

export function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let buffer = "";
	let i = 0;

	const flush = (enclosed: boolean): void => {
		if (enclosed) {
			const text = buffer.trim();
			if (text) {
				tokens.push({ text, enclosed: true, used: false });
			}
			buffer = "";
			return;
		}
		for (const part of buffer.split(/[\s._+]+/)) {
			if (!part || part === "-" || part === "~") {
				continue;
			}
			tokens.push({ text: part, enclosed: false, used: false });
		}
		buffer = "";
	};

	while (i < input.length) {
		const char = input[i];
		const close = OPEN[char];
		if (close) {
			if (buffer) {
				flush(false);
			}
			const end = input.indexOf(close, i + 1);
			if (end < 0) {
				buffer += char;
				i += 1;
				continue;
			}
			buffer = input.slice(i + 1, end);
			flush(true);
			i = end + 1;
			continue;
		}
		buffer += char;
		i += 1;
	}
	if (buffer) {
		flush(false);
	}
	return tokens;
}
