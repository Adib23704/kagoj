import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Pdf } from "@/generated/prisma";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteContext {
	params: Promise<{ id: string }>;
}

function buildContentDisposition(originalName: string): string {
	const ascii = Array.from(originalName, (ch) => {
		const code = ch.charCodeAt(0);
		if (code < 0x20 || code === 0x7f || ch === '"' || ch === "\\") return "_";
		return ch;
	}).join("");
	const encoded = encodeURIComponent(originalName);
	return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(req: NextRequest, context: RouteContext) {
	try {
		const { id } = await context.params;
		const shareId = req.nextUrl.searchParams.get("share");

		let pdf: Pdf | null = null;

		if (shareId) {
			const shareLink = await prisma.shareLink.findUnique({
				where: { shareId },
				include: { pdf: true },
			});

			if (!shareLink?.isActive || shareLink.pdf.id !== id) {
				return NextResponse.json({ error: "Not found" }, { status: 404 });
			}

			pdf = shareLink.pdf;
		} else {
			const session = await getServerSession(authOptions);
			if (!session?.user?.id) {
				return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
			}

			pdf = await prisma.pdf.findFirst({
				where: { id, userId: session.user.id },
			});
		}

		if (!pdf) {
			return NextResponse.json({ error: "PDF not found" }, { status: 404 });
		}

		const cacheControl = shareId
			? "private, max-age=300, must-revalidate"
			: "private, max-age=3600";
		const etag = `"${pdf.id}"`;

		if (req.headers.get("if-none-match") === etag) {
			return new NextResponse(null, {
				status: 304,
				headers: { ETag: etag, "Cache-Control": cacheControl },
			});
		}

		const fileStat = await stat(pdf.storagePath);
		const stream = Readable.toWeb(createReadStream(pdf.storagePath)) as ReadableStream<Uint8Array>;

		return new NextResponse(stream, {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Length": String(fileStat.size),
				"Content-Disposition": buildContentDisposition(pdf.originalName),
				"Cache-Control": cacheControl,
				ETag: etag,
			},
		});
	} catch (error) {
		console.error("Error serving PDF:", error);
		return NextResponse.json({ error: "Failed to serve PDF" }, { status: 500 });
	}
}
