import Image from "next/image";

const CLAIMS = [
  "Turns raw Google reviews into a simple inbox",
  "Drafts a reply so you never stare at a blank box",
  "Flags anything that needs a personal response",
  "Tracks sentiment over time, in plain language",
];

export default function ReputationShowcase() {
  return (
    <section className="bg-ink-900 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
          Manages your <span className="text-mint-400">reputation</span> like a pro
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CLAIMS.map((claim) => (
            <div key={claim} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/80">{claim}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 shadow-sm">
          <Image
            src="/screenshots/review-inbox.png"
            alt="Review inbox showing a Google review with an AI-drafted reply"
            width={1200}
            height={800}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
