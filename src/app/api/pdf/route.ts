import { type NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deletePdf, writePdf } from "@/lib/pdf/storage";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const PDF_MAGIC = Buffer.from("%PDF-");

export async function GET() {
	try {
		const session = await auth();

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

export async function POST(req: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const formData = await req.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			return NextResponse.json({ error: "File size must be less than 50MB" }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		if (
			buffer.length < PDF_MAGIC.length ||
			!buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)
		) {
			return NextResponse.json({ error: "Not a valid PDF file" }, { status: 400 });
		}

		let pageCount: number;
		try {
			const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
			pageCount = doc.getPageCount();
		} catch {
			return NextResponse.json({ error: "Could not parse PDF" }, { status: 400 });
		}

		const { storagePath } = await writePdf(buffer, file.name);

		try {
			const pdf = await prisma.pdf.create({
				data: {
					name: file.name.replace(/\.pdf$/i, ""),
					originalName: file.name,
					storagePath,
					fileSize: file.size,
					pageCount,
					userId: session.user.id,
				},
			});

			return NextResponse.json({ pdf }, { status: 201 });
		} catch (dbError) {
			await deletePdf(storagePath);
			throw dbError;
		}
	} catch (error) {
		console.error("Error uploading PDF:", error);
		return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
	}
}
