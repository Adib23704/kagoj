import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { createShareSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const limit = rateLimit("share", session.user.id, RATE_LIMITS.share);
		if (!limit.allowed) {
			return NextResponse.json(
				{ error: "Too many share links created. Try again later." },
				{ status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
			);
		}

		const result = createShareSchema.safeParse(await req.json());
		if (!result.success) {
			return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
		}

		const { pdfId } = result.data;

		const pdf = await prisma.pdf.findFirst({
			where: { id: pdfId, userId: session.user.id },
		});

		if (!pdf) {
			return NextResponse.json({ error: "PDF not found" }, { status: 404 });
		}

		const shareId = nanoid(10);

		const shareLink = await prisma.shareLink.create({
			data: {
				shareId,
				pdfId,
			},
		});

		const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
		const shareUrl = `${origin}/view/${shareId}`;

		return NextResponse.json({ shareLink, shareUrl }, { status: 201 });
	} catch (error) {
		console.error("Error creating share link:", error);
		return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
	}
}
