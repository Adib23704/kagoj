import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ApiError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { enforceRateLimit, ipKey } from "@/lib/api/with-rate-limit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteContext {
	params: Promise<{ shareId: string }>;
}

// GET: Get shared PDF data (public)
export const GET = withApi<RouteContext>(async (req, context) => {
	await enforceRateLimit(req as NextRequest, {
		name: "share-view",
		windowMs: 60 * 1000,
		max: 60,
		keyOf: ipKey,
	});

	const { shareId } = await context.params;

	const shareLink = await prisma.shareLink.findUnique({
		where: { shareId },
		include: {
			pdf: {
				select: { id: true, name: true, pageCount: true },
			},
		},
	});

	if (!shareLink?.isActive) {
		throw new ApiError("NOT_FOUND", "Link not found");
	}

	await prisma.shareLink.update({
		where: { id: shareLink.id },
		data: { viewCount: { increment: 1 } },
	});

	return NextResponse.json({
		pdf: shareLink.pdf,
		shareId: shareLink.shareId,
	});
});

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
