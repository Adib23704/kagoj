import { Plus } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { PdfList } from "@/components/pdf/pdf-list";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const pdfs = await prisma.pdf.findMany({
    where: { userId: session!.user.id },
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Flipbooks</h1>
          <p className="text-gray-600 mt-1">Manage your uploaded PDFs and share links</p>
        </div>
        <Link href="/upload">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Upload PDF
          </Button>
        </Link>
      </div>

      {pdfs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No flipbooks yet</h3>
          <p className="text-gray-600 mb-4">Upload your first PDF to get started</p>
          <Link href="/upload">
            <Button>Upload PDF</Button>
          </Link>
        </div>
      ) : (
        <PdfList pdfs={pdfs} />
      )}
    </div>
  );
}
