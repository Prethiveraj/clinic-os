"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuditProgress from "@/components/AuditProgress";

type Pending = { query: string; placeId: string; ticket: string };
type FetchOutcome = { ok: true; clinicId: string } | { ok: false; error: string };

export default function AuditRunningPage() {
  const router = useRouter();
  const [query, setQuery] = useState<string | null>(null);
  const [animationDone, setAnimationDone] = useState(false);
  const [fetchOutcome, setFetchOutcome] = useState<FetchOutcome | null>(null);
  const navigated = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const raw = sessionStorage.getItem("pendingAudit");
    if (!raw) {
      router.replace("/");
      return;
    }
    const pending = JSON.parse(raw) as Pending;
    setQuery(pending.query);

    fetch("/api/clinics/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: pending.placeId, ticket: pending.ticket }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
        setFetchOutcome({ ok: true, clinicId: data.clinic.id });
      })
      .catch((err: Error) => {
        setFetchOutcome({ ok: false, error: err.message || "Something went wrong." });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!animationDone || !fetchOutcome || navigated.current) return;
    navigated.current = true;
    sessionStorage.removeItem("pendingAudit");
    if (fetchOutcome.ok) {
      router.push(`/clinic/${fetchOutcome.clinicId}`);
    }
  }, [animationDone, fetchOutcome, router]);

  const failed = animationDone && fetchOutcome && !fetchOutcome.ok;

  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <Link href="/" className="text-lg font-bold text-ink-900">
            Clinic<span className="text-mint-500">Growth</span>
          </Link>

          <p className="mt-10 text-sm font-semibold uppercase tracking-wide text-ink-400">
            {query ? <>Scanning &ldquo;{query}&rdquo;&hellip;</> : "Starting your audit…"}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
            Building you a free growth report
          </h1>
          <p className="mt-4 max-w-sm text-ink-500">
            Explore a working audit built just for {query ?? "your business"} — pulling your Google
            presence, site health, and reviews together in real time.
          </p>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-mint-500 px-5 py-2.5 text-sm font-semibold text-white">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
            {failed ? "Couldn't finish" : "Building…"}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-8">
          {!failed ? (
            <AuditProgress onDone={() => setAnimationDone(true)} />
          ) : (
            <div className="text-center">
              <p className="font-medium text-ink-900">
                {fetchOutcome && !fetchOutcome.ok ? fetchOutcome.error : "Something went wrong."}
              </p>
              <a
                href="/"
                className="mt-4 inline-block rounded-full bg-mint-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-mint-600"
              >
                Try again
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
