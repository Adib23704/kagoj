import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-6">
          <BookOpen className="w-12 h-12 text-gray-900" />
          <h1 className="text-5xl font-bold text-gray-900">Kagoj</h1>
        </div>

        <p className="text-xl text-gray-600 mb-8">
          Transform your PDFs into beautiful, interactive flipbooks. Share with anyone, anywhere.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/signin"
            className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
