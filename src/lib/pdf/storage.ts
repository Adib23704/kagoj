import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "pdfs");

async function ensureDir(dir: string) {
	if (!existsSync(dir)) {
		await mkdir(dir, { recursive: true });
	}
}

export async function uploadPdf(
	file: File
): Promise<{ storagePath: string; originalName: string }> {
	await ensureDir(UPLOAD_DIR);

	const buffer = Buffer.from(await file.arrayBuffer());
	const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
	const filepath = path.join(UPLOAD_DIR, filename);

	await writeFile(filepath, buffer);

	return {
		storagePath: filepath,
		originalName: file.name,
	};
}

export async function getPdfBuffer(storagePath: string): Promise<Buffer> {
	return readFile(storagePath);
}

export async function deletePdf(storagePath: string): Promise<void> {
	try {
		await unlink(storagePath);
	} catch (error) {
		console.error("Error deleting PDF:", error);
	}
}

export function getPdfUrl(pdfId: string): string {
	return `/api/pdf/${pdfId}/file`;
}
