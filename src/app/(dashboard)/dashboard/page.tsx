import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PdfList } from "@/components/pdf/pdf-list";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const INITIAL_LIMIT = 20;

export default async function DashboardPage() {
	const session = await auth();

	if (!session?.user?.id) {
		redirect("/signin");
	}

	const rows = await prisma.pdf.findMany({
		where: { userId: session.user.id },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: INITIAL_LIMIT + 1,
		include: {
			shareLinks: {
				where: { isActive: true },
				select: { id: true, shareId: true, viewCount: true, createdAt: true },
			},
		},
	});

	const hasMore = rows.length > INITIAL_LIMIT;
	const initialItems = hasMore ? rows.slice(0, INITIAL_LIMIT) : rows;
	const initialNextCursor = hasMore ? initialItems[initialItems.length - 1].id : null;

	return (
		<div>
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-2xl font-bold text-white">My Flipbooks</h1>
					<p className="text-gray-400 mt-1">Manage your uploaded PDFs and share links</p>
				</div>
				<Link href="/upload">
					<Button>
						<Plus className="w-4 h-4 mr-2" />
						Upload PDF
					</Button>
				</Link>
			</div>

			{initialItems.length === 0 ? (
				<div className="text-center py-12 bg-bg-raised rounded-lg border border-border-strong">
					<div className="mx-auto w-12 h-12 bg-border-strong rounded-full flex items-center justify-center mb-4">
						<Plus className="w-6 h-6 text-gray-400" />
					</div>
					<h3 className="text-lg font-medium text-white mb-2">No flipbooks yet</h3>
					<p className="text-gray-400 mb-4">Upload your first PDF to get started</p>
					<Link href="/upload">
						<Button>Upload PDF</Button>
					</Link>
				</div>
			) : (
				<PdfList initialItems={initialItems} initialNextCursor={initialNextCursor} />
			)}
		</div>
	);
}
