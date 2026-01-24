import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <BookOpen className="w-8 h-8 text-white" />
        <span className="text-2xl font-bold text-white">Kagoj</span>
      </Link>
      {children}
    </div>
  );
}
