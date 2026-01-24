import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deletePdf, deleteThumbnail } from "@/lib/pdf/storage";
import { pdfRenameSchema } from "@/lib/validations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Get single PDF
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pdf = await prisma.pdf.findFirst({
      where: { id, userId: session.user.id },
      include: {
        shareLinks: {
          where: { isActive: true },
        },
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    return NextResponse.json({ pdf });
  } catch (error) {
    console.error("Error fetching PDF:", error);
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }
}

// PATCH: Rename PDF
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = pdfRenameSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const existingPdf = await prisma.pdf.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingPdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const pdf = await prisma.pdf.update({
      where: { id },
      data: { name: result.data.name },
    });

    return NextResponse.json({ pdf });
  } catch (error) {
    console.error("Error updating PDF:", error);
    return NextResponse.json({ error: "Failed to update PDF" }, { status: 500 });
  }
}

// DELETE: Delete PDF
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pdf = await prisma.pdf.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Delete file from storage
    await deletePdf(pdf.storagePath);
    await deleteThumbnail(pdf.id);

    // Delete from database
    await prisma.pdf.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    return NextResponse.json({ error: "Failed to delete PDF" }, { status: 500 });
  }
}
