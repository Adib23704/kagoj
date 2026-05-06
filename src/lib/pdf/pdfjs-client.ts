export type PDFJSLib = typeof import("pdfjs-dist");

let cached: Promise<PDFJSLib> | null = null;

export function loadPdfjs(): Promise<PDFJSLib> {
	if (!cached) {
		cached = import("pdfjs-dist").then((m) => {
			m.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
			return m;
		});
	}
	return cached;
}
