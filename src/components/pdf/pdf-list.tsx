"use client";

import { PdfCard } from "./pdf-card";

interface ShareLink {
  id: string;
  shareId: string;
  viewCount: number;
  createdAt: Date;
}

interface Pdf {
  id: string;
  name: string;
  originalName: string;
  fileSize: number;
  pageCount: number;
  createdAt: Date;
  shareLinks: ShareLink[];
}

interface PdfListProps {
  pdfs: Pdf[];
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
