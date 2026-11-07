import Image from "next/image";

const FEATURES = [
  {
    label: "Score & Visibility",
    description: "A live 0-100 growth score built from your real Google presence and site health.",
  },
  {
    label: "Reputation",
    description: "Every recent review in one inbox, with an AI-drafted reply ready to edit and post.",
  },
  {
    label: "Growth",
    description: "An AI-built, hosted website plus lead capture — call, WhatsApp, and contact form.",
  },
];

const INTEGRATIONS = [
  { name: "Google", caption: "Places & Business Profile", side: "left" as const },
  { name: "WhatsApp", caption: "Click-to-chat on your site", side: "right" as const },
];

const POWERED_BY = ["Google", "Groq", "Razorpay"];

export default function HubPanel() {
  return (
    <section className="bg-cream-50 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold text-ink-900 sm:text-4xl">
          Handles <span className="text-mint-500">everything</span> so you don&apos;t have to
        </h2>

        <div className="relative mt-12 rounded-[2rem] bg-mint-50 p-8 sm:p-14">
          <div className="relative mx-auto max-w-2xl">
            {INTEGRATIONS.map((integration) => (
              <div
                key={integration.name}
                className={`absolute top-6 hidden w-40 sm:block ${
                  integration.side === "left" ? "-left-6 -translate-x-full" : "-right-6 translate-x-full"
                }`}
              >
                <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 shadow-sm">
                  <p className="text-sm font-medium text-ink-900">{integration.name}</p>
                  <p className="text-xs text-ink-400">{integration.caption}</p>
                </div>
                <svg
                  className={`absolute top-1/2 h-px w-8 text-ink-200 ${
                    integration.side === "left" ? "-right-8" : "-left-8 rotate-180"
                  }`}
                  aria-hidden
                >
                  <line x1="0" y1="0" x2="32" y2="0" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            ))}

            <div className="overflow-hidden rounded-2xl border border-ink-100">
              <Image
                src="/screenshots/score-dashboard.png"
                alt="Real growth score dashboard, showing a clinic's live score breakdown"
                width={1000}
                height={700}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.label}>
              <h3 className="text-lg font-bold text-ink-900">{f.label}</h3>
              <p className="mt-2 text-sm text-ink-500">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          <span className="text-xs uppercase tracking-wide text-ink-400">Powered by</span>
          {POWERED_BY.map((name) => (
            <span key={name} className="text-lg font-semibold text-ink-400/80">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
