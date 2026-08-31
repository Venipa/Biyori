import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { app } from "electron";
import { type ConfOptions as Options, Conf as Store } from "electron-conf/main";
import { Encryption } from "encryption.js";
import { parse as deserialize, stringify as serialize } from "yaml";
import type { ZodType } from "zod";
import { logger } from "../../logger";
import { base64 } from "../base64";
import { generateRandom } from "../randomString";
import slugify, { type SlugifyOptions } from "../slug";
import { ensureYamlSchemaComment, linkYmlStoreSchema, withYamlLanguageServerSchema } from "./yml-schema";

const STORE_EXTENSION = ".biyori";
const ENCRYPTION_ALGORITHM = "aes-256-cbc";
const slugifyOptions = {
	lower: true,
	replacement: "_",
	trim: true,
	remove: /[*+~.()'"!:@]/g,
} as SlugifyOptions;
const getStoreUserData = () => app.getPath("userData");
if (!statSync(getStoreUserData(), { throwIfNoEntry: false })) mkdirSync(getStoreUserData(), { recursive: true });
logger.debug("getStoreUserData", getStoreUserData());
/** Persistent secret for a named encryptor (key file next to userData). */
export function getOrCreateEncryptionSecret(name: string): string {
	const encryptionKeyPath = path.join(getStoreUserData(), `${slugify(name, slugifyOptions)}.key`);
	const storeMasterSecret = base64.encode(name.padStart(32, "0"));
	const enc = new Encryption({ secret: storeMasterSecret, algorithm: ENCRYPTION_ALGORITHM }); // secret requires 32 characters
	if (!existsSync(encryptionKeyPath)) writeFileSync(encryptionKeyPath, enc.encrypt({ name, secret: generateRandom(32) }));
	const encryptionKey = readFileSync(encryptionKeyPath).toString("utf8");
	const payload = enc.decrypt<{ name: string; secret: string }>(encryptionKey);
	if (!payload || name !== payload?.name) throw new Error("Invalid encryption key");
	if (!payload.secret) throw new Error("Invalid encryption secret");
	return payload.secret;
}

export function createEncryption(name: string): Encryption {
	return new Encryption({
		secret: getOrCreateEncryptionSecret(name),
		algorithm: ENCRYPTION_ALGORITHM,
	});
}

function createPublicEncryption(): Encryption {
	return new Encryption({
		secret: "public-encryption".padStart(32, "0"),
		algorithm: ENCRYPTION_ALGORITHM,
	}); // for use for exporting user custom data for other user import
}

export function encryptPublicData(data: Record<string, unknown>): string {
	return createPublicEncryption().encrypt(data);
}

export function decryptPublicData<T extends Record<string, unknown> = Record<string, unknown>>(data: string): T {
	const decrypted = createPublicEncryption().decrypt<T>(data) as T;
	if (!decrypted || typeof decrypted !== "object") {
		throw new Error("Failed to decrypt public data");
	}
	return decrypted;
}

export type CreateYmlStoreOptions<T extends Record<string, unknown> = Record<string, unknown>> = Options<T> & {
	zodSchema?: ZodType;
};

export const createYmlStore = <T extends Record<string, unknown> = Record<string, unknown>>(name: string, options: CreateYmlStoreOptions<T> = {} as CreateYmlStoreOptions<T>) => {
	const { zodSchema, ...confOptions } = options;
	const dir = confOptions.dir ?? getStoreUserData();
	const ext = confOptions.ext ?? STORE_EXTENSION;
	const schemaHref = zodSchema ? linkYmlStoreSchema(dir, name, zodSchema) : null;
	const store = new Store<T>({
		ext: STORE_EXTENSION,
		...confOptions,
		serializer: {
			read(raw) {
				return deserialize(raw);
			},
			write(value) {
				const yaml = serialize(value);
				return schemaHref ? withYamlLanguageServerSchema(yaml, schemaHref) : yaml;
			},
		},
		name,
	});
	if (schemaHref) {
		ensureYamlSchemaComment(path.join(dir, `${name}${ext}`), schemaHref);
	}
	return store;
};

export const createEncryptedStore = <T extends Record<string, unknown> = Record<string, unknown>>(name: string, options: Options<T> = {} as Options<T>) => {
	const storeEncryptor = createEncryption(name);
	return new Store<T>({
		ext: STORE_EXTENSION,
		...options,
		serializer: {
			read(raw) {
				try {
					const decrypted = storeEncryptor.decrypt(raw);
					if (!decrypted || typeof decrypted !== "object") {
						logger.error(`Failed to decrypt store "${name}" — file unreadable, using empty store`);
						return {} as T;
					}
					return decrypted as T;
				} catch (ex) {
					logger.error(`Failed to decrypt store "${name}" — file unreadable, using empty store`, ex);
					const newStore = options.defaults ?? ({} as T); // return empty store on encryption error
					return newStore;
				}
			},
			write(value) {
				return storeEncryptor.encrypt(value);
			},
		},
		name,
	});
};
