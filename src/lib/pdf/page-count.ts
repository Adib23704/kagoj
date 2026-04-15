import { ApiError } from "@/lib/api/errors";

export function assertPdfMagic(buf: Buffer): void {
	if (buf.length < 5 || buf.subarray(0, 5).toString("utf8") !== "%PDF-") {
		throw new ApiError("UNSUPPORTED_MEDIA_TYPE", "File is not a valid PDF");
	}
}

export async function extractPageCount(buf: Buffer): Promise<number> {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	try {
		type PdfjsDocParams = Parameters<typeof pdfjs.getDocument>[0];
		const docParams = {
			data: new Uint8Array(buf),
			disableWorker: true,
			isEvalSupported: false,
		} as unknown as PdfjsDocParams;
		const loadingTask = pdfjs.getDocument(docParams);
		const doc = await loadingTask.promise;
		const n = doc.numPages;
		await doc.destroy();
		return n;
	} catch (err) {
		throw new ApiError("BAD_REQUEST", "Could not read PDF", {
			cause: (err as Error).message,
		});
	}
}
