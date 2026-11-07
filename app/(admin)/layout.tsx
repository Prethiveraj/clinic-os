export const dynamic = "force-dynamic";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import "@/app/globals.css";
import { displayFont } from "@/lib/fonts";
import SessionProvider from "@/components/providers/SessionProvider";
import { getServerAuthSession } from "@/lib/auth";
import SignOutLink from "@/components/SignOutLink";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/login?next=/admin");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <html lang="en" className={displayFont.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <SessionProvider>
          <div className="flex min-h-screen">
            <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
              <Link href="/" className="block px-2 font-semibold text-slate-900">
                Clinic Growth — Admin
              </Link>
              <nav className="mt-8 space-y-1 text-sm">
                <Link href="/admin" className="block rounded-md px-2 py-2 hover:bg-slate-100">
                  Clinics
                </Link>
                <Link href="/admin/usage" className="block rounded-md px-2 py-2 hover:bg-slate-100">
                  API usage
                </Link>
                <Link href="/admin/prompt" className="block rounded-md px-2 py-2 hover:bg-slate-100">
                  Prompt template
                </Link>
              </nav>
              <div className="mt-8 px-2">
                <SignOutLink />
              </div>
            </aside>
            <main className="flex-1 px-8 py-8">{children}</main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
