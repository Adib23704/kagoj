"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
    >
      <LogOut className="w-4 h-4" />
      Sign Out
    </button>
  );
}
