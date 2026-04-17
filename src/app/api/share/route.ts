import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/validation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createShareSchema = z.object({
	pdfId: z.string().min(1, "PDF ID is required"),
});

function appUrl(): string {
	return process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
}

function requireVerification(): boolean {
	return process.env.AUTH_REQUIRE_VERIFICATION_FOR_SHARES !== "false";
}

export const POST = withApi(async (req) => {
	const session = await auth();
	if (!session?.user?.id) {
		throw new ApiError("UNAUTHORIZED", "Unauthorized");
	}

	const { pdfId } = await parseJsonBody(req, createShareSchema);

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { emailVerified: true },
	});

	if (requireVerification() && (!user || user.emailVerified === null)) {
		return NextResponse.json(
			{
				error: {
					code: "EMAIL_NOT_VERIFIED",
					message: "You need to verify your email before creating a public share link.",
				},
			},
			{ status: 403 }
		);
	}

	const pdf = await prisma.pdf.findFirst({
		where: { id: pdfId, userId: session.user.id },
	});
	if (!pdf) {
		throw new ApiError("NOT_FOUND", "PDF not found");
	}

	const shareId = nanoid(10);
	const shareLink = await prisma.shareLink.create({
		data: { shareId, pdfId },
	});
	const shareUrl = `${appUrl()}/view/${shareId}`;

	return NextResponse.json({ shareLink, shareUrl }, { status: 201 });
});
