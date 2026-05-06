import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteContext {
	params: Promise<{ shareId: string }>;
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
	try {
		const session = await auth();
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
