import type { Insight } from "@/lib/insights";

const ICONS: Record<Insight["icon"], React.ReactNode> = {
  globe: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3c0 1-1 1.5-2 1.5-7.5 0-14-6.5-14-14 0-1 .5-2 1.5-2.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7l1.5-2.5h5L16 7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 20c0-3 2.5-5.5 5.5-5.5S14.5 17 14.5 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.8 14.3c2.4.3 4.2 2.4 4.2 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

const IMPACT_STYLE: Record<Insight["impact"], string> = {
  High: "bg-ink-900 text-white",
  Medium: "bg-cream-100 text-ink-700",
  Low: "bg-ink-100 text-ink-400",
};

export default function InsightsGrid({ insights }: { insights: Insight[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {insights.map((insight, i) => (
        <div
          key={insight.title}
          className="animate-fade-in-up rounded-2xl border border-ink-100 bg-white p-5"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                insight.kind === "strength" ? "bg-mint-100 text-mint-500" : "bg-ink-100 text-ink-700"
              }`}
            >
              {ICONS[insight.icon]}
            </span>
            {insight.kind === "opportunity" && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${IMPACT_STYLE[insight.impact]}`}>
                {insight.impact} impact
              </span>
            )}
            {insight.kind === "strength" && (
              <span className="rounded-full bg-mint-100 px-2.5 py-1 text-xs font-semibold text-mint-500">
                Strength
              </span>
            )}
          </div>
          <h3 className="mt-3 font-bold text-ink-900">{insight.title}</h3>
          <p className="mt-1 text-sm text-ink-500">{insight.description}</p>
        </div>
      ))}
    </div>
  );
}
