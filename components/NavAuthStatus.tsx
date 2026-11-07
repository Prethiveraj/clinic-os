"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function NavAuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <Link href="/login" className="text-sm font-semibold text-mint-500 hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link href="/dashboard" className="font-semibold text-mint-500 hover:underline">
        Dashboard
      </Link>
      {session.user.role === "admin" && (
        <Link href="/admin" className="font-semibold text-mint-500 hover:underline">
          Admin
        </Link>
      )}
      <button onClick={() => signOut({ callbackUrl: "/" })} className="text-ink-400 hover:text-ink-700">
        Sign out
      </button>
    </div>
  );
}
