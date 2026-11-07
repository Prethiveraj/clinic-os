"use client";

import { signOut } from "next-auth/react";

export default function SignOutLink() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm text-slate-500 hover:text-slate-700">
      Sign out
    </button>
  );
}
