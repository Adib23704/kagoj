import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 50MB" }, { status: 400 });
    }

    const { storagePath, originalName } = await uploadPdf(file);

    // Get page count from formData (set by client after PDF.js processing)
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
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
  }
}
