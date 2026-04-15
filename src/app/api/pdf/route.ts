import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ApiError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { enforceRateLimit } from "@/lib/api/with-rate-limit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertPdfMagic, extractPageCount } from "@/lib/pdf/page-count";
import { storage } from "@/lib/storage";

// GET: List user's PDFs (cursor-based pagination)
export const GET = withApi(async (req) => {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) throw new ApiError("UNAUTHORIZED", "Sign in required");

	const url = new URL(req.url);
	const limitParam = Number(url.searchParams.get("limit") ?? 20);
	const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 20, 1), 50);
	const cursor = url.searchParams.get("cursor");

	const rows = await prisma.pdf.findMany({
		where: { userId: session.user.id },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: limit + 1,
		...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
		include: {
			shareLinks: {
				where: { isActive: true },
				select: { id: true, shareId: true, viewCount: true, createdAt: true },
			},
		},
	});

	const hasMore = rows.length > limit;
	const items = hasMore ? rows.slice(0, limit) : rows;
	const nextCursor = hasMore ? items[items.length - 1].id : null;

	return NextResponse.json({ items, nextCursor });
});

// POST: Upload new PDF
export const POST = withApi(async (req: Request) => {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		throw new ApiError("UNAUTHORIZED", "Sign in required");
	}

	await enforceRateLimit(req as NextRequest, {
		name: "pdf-upload",
		windowMs: 60 * 60 * 1000,
		max: 20,
		keyOf: () => session.user.id as string,
	});

	const formData = await req.formData();
	const file = formData.get("file") as File | null;

	if (!file) {
		throw new ApiError("BAD_REQUEST", "No file provided");
	}
	if (file.type !== "application/pdf") {
		throw new ApiError("UNSUPPORTED_MEDIA_TYPE", "Only PDF files are allowed");
	}
	if (file.size > 50 * 1024 * 1024) {
		throw new ApiError("PAYLOAD_TOO_LARGE", "File size must be less than 50MB");
	}

	const buf = Buffer.from(await file.arrayBuffer());
	assertPdfMagic(buf);
	const pageCount = await extractPageCount(buf);

	const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64) || "upload.pdf";
	const storageKey = `pdfs/${session.user.id}/${nanoid()}-${safeName}`;
	await storage.put(storageKey, buf, "application/pdf");

	const pdf = await prisma.pdf.create({
		data: {
			name: file.name.replace(/\.pdf$/i, ""),
			originalName: file.name,
			storagePath: storageKey,
			fileSize: file.size,
			pageCount,
			userId: session.user.id,
		},
	});

	return NextResponse.json({ pdf }, { status: 201 });
});
