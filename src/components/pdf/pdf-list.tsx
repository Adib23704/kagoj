"use client";

import type { PdfWithShareLinks } from "@/lib/types";
import { PdfCard } from "./pdf-card";

interface PdfListProps {
	pdfs: PdfWithShareLinks[];
}

export function PdfList({ pdfs }: PdfListProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{pdfs.map((pdf) => (
				<PdfCard key={pdf.id} pdf={pdf} />
			))}
		</div>
	);
}
