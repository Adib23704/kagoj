import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ApiError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { enforceRateLimit } from "@/lib/api/with-rate-limit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadPdf } from "@/lib/pdf/storage";

// GET: List user's PDFs
export async function GET() {
	try {
		const session = await getServerSession(authOptions);

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const pdfs = await prisma.pdf.findMany({
			where: { userId: session.user.id },
			orderBy: { createdAt: "desc" },
			include: {
				shareLinks: {
					where: { isActive: true },
					select: {
						id: true,
						shareId: true,
						viewCount: true,
						createdAt: true,
					},
				},
			},
		});

		return NextResponse.json({ pdfs });
	} catch (error) {
		console.error("Error fetching PDFs:", error);
		return NextResponse.json({ error: "Failed to fetch PDFs" }, { status: 500 });
	}
}

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

	const { storagePath, originalName } = await uploadPdf(file);
	const pageCount = parseInt(formData.get("pageCount") as string, 10) || 1;

	const pdf = await prisma.pdf.create({
		data: {
			name: originalName.replace(/\.pdf$/i, ""),
			originalName,
			storagePath,
			fileSize: file.size,
			pageCount,
			userId: session.user.id,
		},
	});

	return NextResponse.json({ pdf }, { status: 201 });
});
