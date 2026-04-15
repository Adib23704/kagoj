import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "./types";

const sendMock = vi.fn();

interface MockClientThis {
	send: typeof sendMock;
}

vi.mock("@aws-sdk/client-s3", () => {
	return {
		S3Client: vi.fn(function (this: MockClientThis) {
			this.send = sendMock;
		}),
		PutObjectCommand: vi.fn(),
		GetObjectCommand: vi.fn(),
		HeadObjectCommand: vi.fn(),
		DeleteObjectCommand: vi.fn(),
	};
});

import { S3Adapter } from "./s3";

function makeAdapter() {
	return new S3Adapter({
		endpoint: "http://localhost:9000",
		region: "auto",
		bucket: "test",
		accessKeyId: "k",
		secretAccessKey: "s",
	});
}

describe("S3Adapter", () => {
	beforeEach(() => {
		sendMock.mockReset();
	});

	it("put sends a PutObjectCommand", async () => {
		sendMock.mockResolvedValueOnce({});
		const adapter = makeAdapter();
		await adapter.put("a.pdf", Buffer.from("x"), "application/pdf");
		expect(sendMock).toHaveBeenCalledOnce();
	});

	it("get maps NoSuchKey to NotFoundError", async () => {
		sendMock.mockRejectedValueOnce(Object.assign(new Error("missing"), { name: "NoSuchKey" }));
		const adapter = makeAdapter();
		await expect(adapter.get("missing.pdf")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("getRange maps 404 metadata to NotFoundError", async () => {
		sendMock.mockRejectedValueOnce(
			Object.assign(new Error("nope"), { $metadata: { httpStatusCode: 404 } })
		);
		const adapter = makeAdapter();
		await expect(adapter.getRange("missing.pdf", 0, 9)).rejects.toBeInstanceOf(NotFoundError);
	});

	it("stat returns size and mime", async () => {
		sendMock.mockResolvedValueOnce({ ContentLength: 42, ContentType: "application/pdf" });
		const adapter = makeAdapter();
		const s = await adapter.stat("a.pdf");
		expect(s).toEqual({ size: 42, mime: "application/pdf" });
	});

	it("stat defaults missing mime to octet-stream", async () => {
		sendMock.mockResolvedValueOnce({ ContentLength: 10 });
		const adapter = makeAdapter();
		const s = await adapter.stat("a.pdf");
		expect(s).toEqual({ size: 10, mime: "application/octet-stream" });
	});

	it("exists=false when stat 404s", async () => {
		sendMock.mockRejectedValueOnce(Object.assign(new Error("nf"), { name: "NotFound" }));
		const adapter = makeAdapter();
		expect(await adapter.exists("a.pdf")).toBe(false);
	});

	it("exists=true when stat resolves", async () => {
		sendMock.mockResolvedValueOnce({ ContentLength: 1, ContentType: "application/pdf" });
		const adapter = makeAdapter();
		expect(await adapter.exists("a.pdf")).toBe(true);
	});

	it("delete sends a DeleteObjectCommand", async () => {
		sendMock.mockResolvedValueOnce({});
		const adapter = makeAdapter();
		await adapter.delete("a.pdf");
		expect(sendMock).toHaveBeenCalledOnce();
	});
});
