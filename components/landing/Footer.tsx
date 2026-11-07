import Link from "next/link";
import { contactEmail } from "@/lib/env";

function columns(): { title: string; links: { label: string; href: string }[] }[] {
  const email = contactEmail();
  return [
  {
    title: "Product",
    links: [
      { label: "Get your score", href: "/" },
      { label: "Login", href: "/login" },
    ],
  },
  ...(email ? [{ title: "Company", links: [{ label: "Contact", href: `mailto:${email}` }] }] : []),
  ];
}

export default function Footer() {
  return (
    <footer className="bg-ink-900 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <span className="text-lg font-bold">Clinic Growth</span>
            <p className="mt-3 max-w-xs text-sm text-white/60">
              The growth system built for Indian clinics — score, site, and reputation, in one place.
            </p>
          </div>

          {columns().map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">{col.title}</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-white/80 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} Clinic Growth. All rights reserved.</p>
          <Link
            href="/login"
            className="rounded-full bg-mint-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-mint-600"
          >
            Find My Clinic
          </Link>
        </div>
      </div>
    </footer>
  );
}
