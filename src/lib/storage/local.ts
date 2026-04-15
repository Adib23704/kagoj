import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { joinKey, mimeSidecarPath } from "./mime";
import { NotFoundError, type StorageAdapter, type StorageStat } from "./types";

export interface LocalDiskOptions {
	rootPath: string;
}

export class LocalDiskAdapter implements StorageAdapter {
	private readonly root: string;

	constructor(opts: LocalDiskOptions) {
		this.root = path.resolve(opts.rootPath);
	}

	async put(key: string, data: Buffer | Readable, mime: string): Promise<void> {
		const full = joinKey(this.root, key);
		await fs.mkdir(path.dirname(full), { recursive: true });
		if (Buffer.isBuffer(data)) {
			await fs.writeFile(full, data);
		} else {
			await pipeline(data, createWriteStream(full));
		}
		await fs.writeFile(mimeSidecarPath(full), mime, "utf8");
	}

	async get(key: string): Promise<Readable> {
		const full = joinKey(this.root, key);
		if (!(await this.fileExists(full))) throw new NotFoundError(key);
		return createReadStream(full);
	}

	async getRange(key: string, start: number, end: number): Promise<Readable> {
		const full = joinKey(this.root, key);
		if (!(await this.fileExists(full))) throw new NotFoundError(key);
		return createReadStream(full, { start, end });
	}

	async stat(key: string): Promise<StorageStat> {
		const full = joinKey(this.root, key);
		if (!(await this.fileExists(full))) throw new NotFoundError(key);
		const [s, mime] = await Promise.all([
			fs.stat(full),
			fs.readFile(mimeSidecarPath(full), "utf8").catch(() => "application/octet-stream"),
		]);
		return { size: s.size, mime };
	}

	async delete(key: string): Promise<void> {
		const full = joinKey(this.root, key);
		await fs.rm(full, { force: true });
		await fs.rm(mimeSidecarPath(full), { force: true });
	}

	async exists(key: string): Promise<boolean> {
		const full = joinKey(this.root, key);
		return this.fileExists(full);
	}

	private async fileExists(p: string): Promise<boolean> {
		try {
			await fs.access(p);
			return true;
		} catch {
			return false;
		}
	}
}
