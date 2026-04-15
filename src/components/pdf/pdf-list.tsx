"use client";

import { useCallback, useState } from "react";
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
	initialItems: Pdf[];
	initialNextCursor: string | null;
}

interface ApiResponse {
	items: Pdf[];
	nextCursor: string | null;
}

export function PdfList({ initialItems, initialNextCursor }: PdfListProps) {
	const [items, setItems] = useState<Pdf[]>(initialItems);
	const [cursor, setCursor] = useState<string | null>(initialNextCursor);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadMore = useCallback(async () => {
		if (!cursor || loading) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/pdf?cursor=${encodeURIComponent(cursor)}`);
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error?.message ?? "Failed to load more");
			}
			const data: ApiResponse = await res.json();
			setItems((prev) => [
				...prev,
				...data.items.map((p) => ({
					...p,
					createdAt: new Date(p.createdAt),
					shareLinks: p.shareLinks.map((s) => ({ ...s, createdAt: new Date(s.createdAt) })),
				})),
			]);
			setCursor(data.nextCursor);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load more");
		} finally {
			setLoading(false);
		}
	}, [cursor, loading]);

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{items.map((pdf) => (
					<PdfCard key={pdf.id} pdf={pdf} />
				))}
			</div>
			{error && <p className="text-danger text-sm text-center mt-4">{error}</p>}
			{cursor && (
				<div className="flex justify-center mt-8">
					<button
						type="button"
						onClick={loadMore}
						disabled={loading}
						className="px-4 py-2 rounded-md bg-bg-raised border border-border-muted hover:border-border-strong text-text-primary text-sm disabled:opacity-50"
					>
						{loading ? "Loading..." : "Load more"}
					</button>
				</div>
			)}
		</>
	);
}
