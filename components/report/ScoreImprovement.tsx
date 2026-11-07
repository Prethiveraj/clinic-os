"use client";

import { useEffect, useState } from "react";

function useCountUp(target: number, durationMs = 900, delayMs = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now();
      let raf: number;
      function tick(now: number) {
        const progress = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

function Ring({ value, color, trackColor }: { value: number; color: string; trackColor: string }) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);
  const offset = circumference - (mounted ? value / 100 : 0) * circumference;

  return (
    <svg viewBox="0 0 108 108" className="h-28 w-28 -rotate-90">
      <circle cx="54" cy="54" r={r} fill="none" stroke={trackColor} strokeWidth="9" />
      <circle
        cx="54"
        cy="54"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </svg>
  );
}

/**
 * The "projected" score is an illustrative sales estimate (current + a
 * capped uplift), not a guarantee — same pattern as a before/after
 * marketing graphic. Framed as illustrative in the copy below the circles.
 */
export default function ScoreImprovement({ overall }: { overall: number }) {
  const projected = Math.min(96, overall + 28 + Math.round((100 - overall) * 0.2));
  const currentDisplay = useCountUp(overall);
  const projectedDisplay = useCountUp(projected, 900, 150);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-10">
      <h2 className="text-center text-2xl font-bold tracking-tightest text-ink-900 sm:text-3xl">
        Your presence, improved
      </h2>

      <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12">
        <div className="text-center">
          <p className="mb-3 text-sm font-semibold text-ink-500">Current</p>
          <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
            <Ring value={overall} color="#E8695A" trackColor="#F3E6E2" />
            <span className="absolute text-2xl font-bold text-ink-900">{currentDisplay}</span>
          </div>
        </div>

        <svg viewBox="0 0 24 24" className="h-6 w-6 rotate-90 text-ink-300 sm:rotate-0" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="text-center">
          <p className="mb-3 text-sm font-semibold text-mint-500">With Clinic Growth</p>
          <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
            <Ring value={projected} color="#094413" trackColor="#EAF2EC" />
            <span className="absolute text-2xl font-bold text-ink-900">{projectedDisplay}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-4 text-center">
        <div className="rounded-xl bg-mint-50 px-4 py-3">
          <p className="text-xl font-bold text-ink-900">~{Math.round((projected - overall) * 0.6)}%</p>
          <p className="text-xs text-ink-500">potential conversion lift</p>
        </div>
        <div className="rounded-xl bg-cream-50 px-4 py-3">
          <p className="text-xl font-bold text-ink-900">30 days</p>
          <p className="text-xs text-ink-500">to a live, bookable site</p>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-md text-center text-xs text-ink-400">
        Illustrative projection based on clinics with a similar starting score — your results will
        vary with your market and follow-through.
      </p>
    </div>
  );
}
