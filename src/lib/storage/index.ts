import path from "node:path";
import { LocalDiskAdapter } from "./local";
import { S3Adapter } from "./s3";
import type { StorageAdapter } from "./types";

export type { StorageAdapter, StorageStat } from "./types";
export { NotFoundError } from "./types";

function buildAdapter(): StorageAdapter {
	const driver = process.env.STORAGE_DRIVER ?? "local";
	if (driver === "local") {
		const rootPath = process.env.STORAGE_LOCAL_PATH ?? path.join(process.cwd(), "uploads");
		return new LocalDiskAdapter({ rootPath });
	}
	if (driver === "s3") {
		const required = [
			"STORAGE_S3_ENDPOINT",
			"STORAGE_S3_BUCKET",
			"STORAGE_S3_ACCESS_KEY_ID",
			"STORAGE_S3_SECRET_ACCESS_KEY",
		];
		for (const k of required) {
			if (!process.env[k]) throw new Error(`Missing required env var: ${k}`);
		}
		return new S3Adapter({
			endpoint: process.env.STORAGE_S3_ENDPOINT as string,
			bucket: process.env.STORAGE_S3_BUCKET as string,
			region: process.env.STORAGE_S3_REGION ?? "auto",
			accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID as string,
			secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY as string,
		});
	}
	throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
}

const globalForStorage = globalThis as unknown as { storage?: StorageAdapter };
export const storage: StorageAdapter = globalForStorage.storage ?? buildAdapter();
if (process.env.NODE_ENV !== "production") globalForStorage.storage = storage;
