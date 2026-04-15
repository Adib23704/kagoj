import { Readable } from "node:stream";
import type { Pdf } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ApiError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

interface RouteContext {
	params: Promise<{ id: string }>;
}

function parseRange(header: string, size: number): { start: number; end: number } | null {
	const m = /^bytes=(\d+)-(\d*)$/.exec(header);
	if (!m) return null;
	const start = Number(m[1]);
	const end = m[2] ? Number(m[2]) : size - 1;
	if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) return null;
	return { start, end };
}

export const GET = withApi<RouteContext>(async (req, context) => {
	const { id } = await context.params;
	const nextReq = req as NextRequest;
	const shareId = nextReq.nextUrl.searchParams.get("share");

	let pdf: Pdf | null = null;

	if (shareId) {
		const shareLink = await prisma.shareLink.findUnique({
			where: { shareId },
			include: { pdf: true },
		});
		if (!shareLink?.isActive || shareLink.pdf.id !== id) {
			throw new ApiError("NOT_FOUND", "Not found");
		}
		pdf = shareLink.pdf;
	} else {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) throw new ApiError("UNAUTHORIZED", "Sign in required");
		pdf = await prisma.pdf.findFirst({ where: { id, userId: session.user.id } });
	}

	if (!pdf) throw new ApiError("NOT_FOUND", "PDF not found");

	const stat = await storage.stat(pdf.storagePath);
	const rangeHeader = req.headers.get("range");

	const commonHeaders: HeadersInit = {
		"Content-Type": stat.mime,
		"Content-Disposition": `inline; filename="${pdf.originalName}"`,
		"Accept-Ranges": "bytes",
		"Cache-Control": "private, no-store",
	};

	if (rangeHeader) {
		const range = parseRange(rangeHeader, stat.size);
		if (!range) {
			return new NextResponse(null, {
				status: 416,
				headers: { "Content-Range": `bytes */${stat.size}` },
			});
		}
		const nodeStream = await storage.getRange(pdf.storagePath, range.start, range.end);
		const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
		return new NextResponse(webStream, {
			status: 206,
			headers: {
				...commonHeaders,
				"Content-Length": String(range.end - range.start + 1),
				"Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
			},
		});
	}

	const nodeStream = await storage.get(pdf.storagePath);
	const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
	return new NextResponse(webStream, {
		status: 200,
		headers: {
			...commonHeaders,
			"Content-Length": String(stat.size),
		},
	});
});
