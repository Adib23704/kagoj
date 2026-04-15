import type { Readable } from "node:stream";
import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
	type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { NotFoundError, type StorageAdapter, type StorageStat } from "./types";

export interface S3Options {
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	forcePathStyle?: boolean;
}

export class S3Adapter implements StorageAdapter {
	private readonly client: S3Client;
	private readonly bucket: string;

	constructor(opts: S3Options) {
		const cfg: S3ClientConfig = {
			endpoint: opts.endpoint,
			region: opts.region,
			credentials: {
				accessKeyId: opts.accessKeyId,
				secretAccessKey: opts.secretAccessKey,
			},
			forcePathStyle: opts.forcePathStyle ?? true,
		};
		this.client = new S3Client(cfg);
		this.bucket = opts.bucket;
	}

	async put(key: string, data: Buffer | Readable, mime: string): Promise<void> {
		await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: data,
				ContentType: mime,
			})
		);
	}

	async get(key: string): Promise<Readable> {
		try {
			const r = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
			return r.Body as Readable;
		} catch (err) {
			if (isNotFound(err)) throw new NotFoundError(key);
			throw err;
		}
	}

	async getRange(key: string, start: number, end: number): Promise<Readable> {
		try {
			const r = await this.client.send(
				new GetObjectCommand({
					Bucket: this.bucket,
					Key: key,
					Range: `bytes=${start}-${end}`,
				})
			);
			return r.Body as Readable;
		} catch (err) {
			if (isNotFound(err)) throw new NotFoundError(key);
			throw err;
		}
	}

	async stat(key: string): Promise<StorageStat> {
		try {
			const r = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
			return {
				size: r.ContentLength ?? 0,
				mime: r.ContentType ?? "application/octet-stream",
			};
		} catch (err) {
			if (isNotFound(err)) throw new NotFoundError(key);
			throw err;
		}
	}

	async delete(key: string): Promise<void> {
		await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
	}

	async exists(key: string): Promise<boolean> {
		try {
			await this.stat(key);
			return true;
		} catch (err) {
			if (err instanceof NotFoundError) return false;
			throw err;
		}
	}
}

function isNotFound(err: unknown): boolean {
	if (typeof err !== "object" || err === null) return false;
	const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
	return e.name === "NoSuchKey" || e.name === "NotFound" || e.$metadata?.httpStatusCode === 404;
}
