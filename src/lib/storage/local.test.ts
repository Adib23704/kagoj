import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalDiskAdapter } from "./local";
import { NotFoundError } from "./types";

async function streamToBuffer(s: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of s) chunks.push(chunk as Buffer);
	return Buffer.concat(chunks);
}

describe("LocalDiskAdapter", () => {
	let root: string;
	let adapter: LocalDiskAdapter;

	beforeEach(() => {
		root = mkdtempSync(path.join(tmpdir(), "kagoj-storage-"));
		adapter = new LocalDiskAdapter({ rootPath: root });
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("round-trips a buffer through put/get", async () => {
		await adapter.put("docs/a.pdf", Buffer.from("hello world"), "application/pdf");
		const buf = await streamToBuffer(await adapter.get("docs/a.pdf"));
		expect(buf.toString()).toBe("hello world");
	});

	it("reports correct stat after put", async () => {
		await adapter.put("docs/a.pdf", Buffer.from("hello"), "application/pdf");
		const s = await adapter.stat("docs/a.pdf");
		expect(s.size).toBe(5);
		expect(s.mime).toBe("application/pdf");
	});

	it("serves a byte range via getRange", async () => {
		await adapter.put("docs/a.pdf", Buffer.from("abcdefghij"), "application/pdf");
		const buf = await streamToBuffer(await adapter.getRange("docs/a.pdf", 2, 5));
		expect(buf.toString()).toBe("cdef");
	});

	it("returns exists=false for missing keys", async () => {
		expect(await adapter.exists("nope.pdf")).toBe(false);
	});

	it("throws NotFoundError on get of missing key", async () => {
		await expect(adapter.get("nope.pdf")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("deletes keys cleanly and is idempotent", async () => {
		await adapter.put("docs/a.pdf", Buffer.from("x"), "application/pdf");
		await adapter.delete("docs/a.pdf");
		expect(await adapter.exists("docs/a.pdf")).toBe(false);
		await expect(adapter.delete("docs/a.pdf")).resolves.toBeUndefined();
	});

	it("rejects path-traversal keys", async () => {
		await expect(adapter.put("../evil", Buffer.from("x"), "application/pdf")).rejects.toThrow();
	});
});
