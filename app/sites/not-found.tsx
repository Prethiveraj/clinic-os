import Link from "next/link";

/** 404 inside a clinic site (e.g. a blog post that is unpublished or never existed). */
export default function SiteNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">This page isn&apos;t available</h1>
      <p className="mt-3 text-slate-600">It may have been moved or isn&apos;t published yet.</p>
      <Link href="/" className="mt-6 font-semibold text-brand-700 underline">
        Go to the home page
      </Link>
    </main>
  );
}
