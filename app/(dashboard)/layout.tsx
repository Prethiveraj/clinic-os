export const dynamic = "force-dynamic";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import "@/app/globals.css";
import { displayFont } from "@/lib/fonts";
import SessionProvider from "@/components/providers/SessionProvider";
import { getServerAuthSession } from "@/lib/auth";
import SignOutLink from "@/components/SignOutLink";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/login?next=/dashboard");

  return (
    <html lang="en" className={displayFont.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <SessionProvider>
          <div className="flex min-h-screen">
            <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
              <Link href="/" className="block px-2 font-semibold text-slate-900">
                Clinic Growth
              </Link>
              <nav className="mt-8 space-y-1 text-sm">
                <Link href="/dashboard" className="block rounded-md px-2 py-2 hover:bg-slate-100">
                  Overview
                </Link>
                <Link href="/dashboard/leads" className="block rounded-md px-2 py-2 hover:bg-slate-100">
                  Leads
                </Link>
                <Link href="/dashboard/patients" className="block rounded-md px-2 py-2 hover:bg-slate-100">
                  Patients
                </Link>
                <Link href="/dashboard/reviews" className="block rounded-md px-2 py-2 hover:bg-slate-100">
                  Reviews
                </Link>
                <Link href="/dashboard/blog" className="block rounded-md px-2 py-2 hover:bg-slate-100">
                  Blog
                </Link>
                <Link href="/dashboard/domain" className="block rounded-md px-2 py-2 hover:bg-slate-100">
                  Domain
                </Link>
                <Link href="/dashboard/settings" className="block rounded-md px-2 py-2 hover:bg-slate-100">
                  Settings
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
