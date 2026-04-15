import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteContext {
	params: Promise<{ shareId: string }>;
}

// GET: Get shared PDF data (public)
export async function GET(_req: NextRequest, context: RouteContext) {
	try {
		const { shareId } = await context.params;

		const shareLink = await prisma.shareLink.findUnique({
			where: { shareId },
			include: {
				pdf: {
					select: {
						id: true,
						name: true,
						pageCount: true,
					},
				},
			},
		});

		if (!shareLink?.isActive) {
			return NextResponse.json({ error: "Link not found" }, { status: 404 });
		}

		await prisma.shareLink.update({
			where: { id: shareLink.id },
			data: { viewCount: { increment: 1 } },
		});

		return NextResponse.json({
			pdf: shareLink.pdf,
			shareId: shareLink.shareId,
		});
	} catch (error) {
		console.error("Error fetching shared PDF:", error);
		return NextResponse.json({ error: "Failed to fetch shared PDF" }, { status: 500 });
	}
}

// DELETE: Revoke share link
export async function DELETE(_req: NextRequest, context: RouteContext) {
	try {
		const session = await getServerSession(authOptions);
		const { shareId } = await context.params;

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const shareLink = await prisma.shareLink.findUnique({
			where: { shareId },
			include: { pdf: true },
		});

		if (!shareLink || shareLink.pdf.userId !== session.user.id) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		await prisma.shareLink.update({
			where: { id: shareLink.id },
			data: { isActive: false },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error revoking share link:", error);
		return NextResponse.json({ error: "Failed to revoke share link" }, { status: 500 });
	}
}
