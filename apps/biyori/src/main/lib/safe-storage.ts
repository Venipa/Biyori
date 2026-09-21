import { safeStorage } from "electron";

export function isSafeStorageAvailable(): boolean {
	return safeStorage.isEncryptionAvailable();
}

export function encryptWithSafeStorage(plainText: string): Buffer {
	if (!safeStorage.isEncryptionAvailable()) {
		throw new Error("Safe storage encryption is not available");
	}
	return safeStorage.encryptString(plainText);
}

export function decryptWithSafeStorage(encrypted: Buffer): string {
	return safeStorage.decryptString(encrypted);
}
