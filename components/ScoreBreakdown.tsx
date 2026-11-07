"use client";

import { useEffect, useState } from "react";

const LABELS: Record<string, string> = {
  visibility: "Visibility",
  siteHealth: "Site health",
  reviews: "Reviews",
  conversionReadiness: "Conversion readiness",
};

const ORDER = ["visibility", "siteHealth", "reviews", "conversionReadiness"];

function bandColor(score: number): string {
  if (score >= 70) return "#1FB579"; // mint — healthy
  if (score >= 40) return "#E8A838"; // amber — needs attention
  return "#E8695A"; // soft red — priority
}

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

function ScoreGauge({ overall }: { overall: number }) {
  const [mounted, setMounted] = useState(false);
  const displayed = useCountUp(overall);
  const r = 54;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const offset = circumference - (mounted ? overall / 100 : 0) * circumference;
  const color = bandColor(overall);

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#EEF0F3" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-ink-900">{displayed}</span>
        <span className="text-xs text-ink-400">out of 100</span>
      </div>
    </div>
  );
}

export default function ScoreBreakdown({
  overall,
  subScores,
}: {
  overall: number;
  subScores: Record<string, number>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  const entries = ORDER.filter((k) => k in subScores).map((k) => [k, subScores[k]] as const);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <ScoreGauge overall={overall} />

        <div className="w-full flex-1 space-y-4">
          {entries.map(([key, value], i) => (
            <div key={key}>
              <div className="flex justify-between text-sm text-ink-700">
                <span>{LABELS[key] ?? key}</span>
                <span className="font-semibold">{value}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: mounted ? `${value}%` : "0%",
                    backgroundColor: bandColor(value),
                    transition: `width 900ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 90}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
