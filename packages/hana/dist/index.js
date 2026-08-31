const { existsSync } = require("node:fs");
const { join } = require("node:path");

function bindingName() {
	const { platform, arch } = process;
	if (platform === "win32") {
		return `hana.win32-${arch}-msvc.node`;
	}
	if (platform === "darwin") {
		return `hana.darwin-${arch}.node`;
	}
	if (platform === "linux") {
		return `hana.linux-${arch}-gnu.node`;
	}
	throw new Error(`Hana has no native binding for ${platform}-${arch}`);
}

function loadNative() {
	const file = join(__dirname, bindingName());
	if (!existsSync(file)) {
		throw new Error(`Hana native binding missing: ${file}. Run bun run --cwd packages/hana build`);
	}
	return require(file);
}

/** @type {ReturnType<typeof loadNative> | null} */
let native = null;

function binding() {
	if (!native) {
		native = loadNative();
	}
	return native;
}

function toError(error) {
	if (error instanceof Error) {
		return error;
	}
	return new Error(String(error));
}

class Hana {
	async parse(input) {
		try {
			return await binding().parse(input);
		} catch (error) {
			throw toError(error);
		}
	}

	async parseTogether(input) {
		try {
			return await binding().parseTogether(input);
		} catch (error) {
			throw toError(error);
		}
	}

	async scan(input, onProgress) {
		try {
			const progress =
				typeof onProgress === "function"
					? (err, update) => {
							if (!err) {
								onProgress(update);
							}
						}
					: undefined;
			return await binding().scan(input, progress);
		} catch (error) {
			throw toError(error);
		}
	}

	async findEpisode(input) {
		try {
			return await binding().findEpisode(input);
		} catch (error) {
			throw toError(error);
		}
	}

	async nowPlaying(input) {
		try {
			return await binding().nowPlaying(input);
		} catch (error) {
			throw toError(error);
		}
	}

	async dispose() {}
}

const hana = new Hana();

function readVersion() {
	try {
		const native = binding();
		const value = typeof native.version === "function" ? native.version() : native.version;
		if (typeof value === "string" && value) {
			return value;
		}
	} catch {
		// addon missing in unit tests
	}
	return require("../package.json").version;
}

const version = readVersion();

module.exports = { Hana, hana, version };
