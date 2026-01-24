import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST: Create share link
export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { pdfId } = await req.json();

		if (!pdfId) {
			return NextResponse.json({ error: "PDF ID is required" }, { status: 400 });
		}

		// Verify PDF belongs to user
		const pdf = await prisma.pdf.findFirst({
			where: { id: pdfId, userId: session.user.id },
		});

		if (!pdf) {
			return NextResponse.json({ error: "PDF not found" }, { status: 404 });
		}

		// Generate short share ID
		const shareId = nanoid(10);

		const shareLink = await prisma.shareLink.create({
			data: {
				shareId,
				pdfId,
			},
		});

		const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/${shareId}`;

		return NextResponse.json({ shareLink, shareUrl }, { status: 201 });
	} catch (error) {
		console.error("Error creating share link:", error);
		return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
	}
}
