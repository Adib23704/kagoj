import { BookOpen, FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <BookOpen className="w-6 h-6 text-gray-900" />
            <span className="font-bold text-gray-900">Kagoj</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <FileQuestion className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Flipbook Not Found</h1>
          <p className="text-gray-600 mb-6">
            This link may have been removed or is no longer available.
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
