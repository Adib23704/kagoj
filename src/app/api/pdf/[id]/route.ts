import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/validation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { storage } from "@/lib/storage";
import { pdfRenameSchema } from "@/lib/validations";

interface RouteContext {
	params: Promise<{ id: string }>;
}

export const GET = withApi<RouteContext>(async (_req, context) => {
	const session = await auth();
	if (!session?.user?.id) throw new ApiError("UNAUTHORIZED", "Sign in required");

	const { id } = await context.params;
	const pdf = await prisma.pdf.findFirst({
		where: { id, userId: session.user.id },
		include: { shareLinks: { where: { isActive: true } } },
	});
	if (!pdf) throw new ApiError("NOT_FOUND", "PDF not found");
	return NextResponse.json({ pdf });
});

export const PATCH = withApi<RouteContext>(async (req, context) => {
	const session = await auth();
	if (!session?.user?.id) throw new ApiError("UNAUTHORIZED", "Sign in required");

	const { id } = await context.params;
	const { name } = await parseJsonBody(req, pdfRenameSchema);

	const existing = await prisma.pdf.findFirst({
		where: { id, userId: session.user.id },
		select: { id: true },
	});
	if (!existing) throw new ApiError("NOT_FOUND", "PDF not found");

	const pdf = await prisma.pdf.update({ where: { id }, data: { name } });
	return NextResponse.json({ pdf });
});

export const DELETE = withApi<RouteContext>(async (_req, context) => {
	const session = await auth();
	if (!session?.user?.id) throw new ApiError("UNAUTHORIZED", "Sign in required");

	const { id } = await context.params;
	const pdf = await prisma.pdf.findFirst({
		where: { id, userId: session.user.id },
	});
	if (!pdf) throw new ApiError("NOT_FOUND", "PDF not found");

	await prisma.pdf.delete({ where: { id } });

	try {
		await storage.delete(pdf.storagePath);
	} catch (err) {
		logger.warn({ err, storagePath: pdf.storagePath }, "storage-delete-failed");
	}

	return NextResponse.json({ success: true });
});
