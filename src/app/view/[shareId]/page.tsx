import { BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlipbookViewer } from "@/components/flipbook/flipbook-viewer";
import { prisma } from "@/lib/db";

interface PageProps {
	params: Promise<{ shareId: string }>;
}

export default async function SharedViewerPage({ params }: PageProps) {
	const { shareId } = await params;

	const shareLink = await prisma.shareLink.findUnique({
		where: { shareId },
		include: {
			pdf: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	if (!shareLink || !shareLink.isActive) {
		notFound();
	}

	// Increment view count (fire and forget)
	prisma.shareLink
		.update({
			where: { id: shareLink.id },
			data: { viewCount: { increment: 1 } },
		})
		.catch(() => {});

	const pdfUrl = `/api/pdf/${shareLink.pdf.id}/file?share=${shareId}`;

	return (
		<div className="min-h-screen bg-gray-100">
			{/* Header */}
			<header className="bg-white border-b border-gray-200 py-3">
				<div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2">
						<BookOpen className="w-6 h-6 text-gray-900" />
						<span className="font-bold text-gray-900">Kagoj</span>
					</Link>
					<Link href="/signup" className="text-sm text-gray-600 hover:text-gray-900">
						Create your own flipbook
					</Link>
				</div>
			</header>

			{/* Viewer */}
			<main>
				<FlipbookViewer pdfUrl={pdfUrl} title={shareLink.pdf.name} />
			</main>
		</div>
	);
}
