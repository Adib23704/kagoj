import type { Readable } from "node:stream";

export interface StorageStat {
	size: number;
	mime: string;
}

export interface StorageAdapter {
	put(key: string, data: Buffer | Readable, mime: string): Promise<void>;
	get(key: string): Promise<Readable>;
	getRange(key: string, start: number, end: number): Promise<Readable>;
	stat(key: string): Promise<StorageStat>;
	delete(key: string): Promise<void>;
	exists(key: string): Promise<boolean>;
}

export class NotFoundError extends Error {
	constructor(key: string) {
		super(`Storage key not found: ${key}`);
		this.name = "NotFoundError";
	}
}
