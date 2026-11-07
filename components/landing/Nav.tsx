"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled ? "border-ink-100 bg-white/90 backdrop-blur" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-ink-900">
          Clinic<span className="text-mint-500">Growth</span>
        </Link>
        <Link
          href="/login"
          className="rounded-full bg-mint-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-mint-600"
        >
          Login
        </Link>
      </div>
    </nav>
  );
}
