import Link from "next/link";

export default function MarketingNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-ink-400">404</p>
      <h1 className="mt-2 text-3xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-3 text-ink-500">Check the address, or start again from the home page.</p>
      <Link href="/" className="mt-6 rounded-full bg-mint-500 px-6 py-3 font-semibold text-white hover:bg-mint-600">
        Go to the home page
      </Link>
    </main>
  );
}
