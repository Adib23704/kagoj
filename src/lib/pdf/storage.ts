import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "pdfs");

export async function writePdf(
	buffer: Buffer,
	originalName: string
): Promise<{ storagePath: string }> {
	await mkdir(UPLOAD_DIR, { recursive: true });

	const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
	const filename = `${Date.now()}-${safeName}`;
	const filepath = path.join(UPLOAD_DIR, filename);

	await writeFile(filepath, buffer);

	return { storagePath: filepath };
}

export async function deletePdf(storagePath: string): Promise<void> {
	try {
		await unlink(storagePath);
	} catch (error) {
		console.error("Error deleting PDF:", error);
	}
}
