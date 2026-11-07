import SearchForm from "@/components/landing/SearchForm";

/**
 * Logo row is a CMS-editable slot: set PARTNER_LOGOS to a comma-separated
 * list of names once there are real clinic/partner logos to show. Per
 * v2-features.md §4, it must not render a visibly-empty placeholder row —
 * so with nothing configured, the row simply isn't rendered at all.
 */
export default function TrustBanner() {
  const logos = (process.env.PARTNER_LOGOS ?? "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <section className="bg-ink-900 px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Real clinics. <span className="text-mint-400">Real results.</span>
        </h2>
        <p className="mt-4 text-white/70">
          See where your clinic actually stands, in the same search box every visitor sees.
        </p>
        <div className="mt-8 flex justify-center">
          <SearchForm variant="compact" />
        </div>

        {logos.length > 0 && (
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-white/10 pt-10">
            {logos.map((name) => (
              <span key={name} className="text-lg font-semibold text-white/50">
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
