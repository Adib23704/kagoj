import type { Pdf } from "@/generated/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPdfBuffer } from "@/lib/pdf/storage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    // Check if this is a share link access
    const shareId = req.nextUrl.searchParams.get("share");

    let pdf: Pdf | null = null;

    if (shareId) {
      // Access via share link
      const shareLink = await prisma.shareLink.findUnique({
        where: { shareId },
        include: { pdf: true },
      });

      if (!shareLink || !shareLink.isActive || shareLink.pdf.id !== id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      pdf = shareLink.pdf;
    } else {
      // Access by owner
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

    const buffer = await getPdfBuffer(pdf.storagePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdf.originalName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving PDF:", error);
    return NextResponse.json({ error: "Failed to serve PDF" }, { status: 500 });
  }
}
