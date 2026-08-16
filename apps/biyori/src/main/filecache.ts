import { app } from "electron";
import Encryption from "encryption.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { base64 } from "./lib/base64";

const cachePath = join(app.getPath("userData"), "cache");
if (!existsSync(cachePath)) mkdirSync(cachePath);
export async function cacheWithFile<T>(fn: () => Promise<T>, key: string): Promise<T> {
	const enc = new Encryption({ secret: base64.encode(key.padStart(32, "0")) });
	const cacheFile = join(cachePath, key + ".ytm");
	if (existsSync(cacheFile)) {
		return enc.decrypt(readFileSync(cacheFile, "utf8")) as T;
	}
	const result = (await fn()) as T;
	writeFileSync(cacheFile, enc.encrypt(result));
	return result;
}
