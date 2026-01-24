import { BookOpen, LayoutDashboard, Upload } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SignOutButton } from "@/components/auth/signout-button";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[#2a2a2a] border-b border-[#3a3a3a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-white" />
              <span className="text-xl font-bold text-white">Kagoj</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                href="/upload"
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <Upload className="w-4 h-4" />
                Upload
              </Link>
              <SignOutButton />
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
