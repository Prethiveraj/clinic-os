import { contactEmail } from "@/lib/env";
const FAQS: [string, string][] = [
  [
    "What does it cost?",
    "A monthly or annual subscription per clinic, billed via Razorpay. The free growth score and demo site are no-cost — you only pay once you activate.",
  ],
  [
    "Is there a contract or lock-in?",
    "No fixed contract term. Cancel anytime; your site stays live (watermarked) rather than going dark, so you're never cut off mid-decision.",
  ],
  [
    "What happens to my existing website or domain?",
    "Nothing changes until you choose to. You can point your existing domain at your new site whenever you're ready — your current one keeps working until then.",
  ],
  [
    "Do I need any technical knowledge?",
    "No. Search your clinic, sign up, and your demo site generates automatically. Connecting a custom domain is a copy-paste DNS step with instructions built in.",
  ],
  [
    "How long does setup take?",
    "The score and demo site are ready in minutes. Going live is as fast as completing checkout — a custom domain adds the time for DNS to propagate.",
  ],
  [
    "Do I actually own my site and domain?",
    "Yes. Your domain is yours, registered wherever you choose. Your site content is yours — export or walk away anytime.",
  ],
  [
    "Do you support UPI or Indian payment methods?",
    "Yes — billing runs through Razorpay, so UPI, cards, and net banking are all supported.",
  ],
];

export default function FAQ() {
  const email = contactEmail();
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-[1fr_2fr]">
        <div>
          <h2 className="text-3xl font-bold text-ink-900">Questions, answered.</h2>
          {email && (
            <p className="mt-4 text-sm text-ink-500">
              Still have questions?{" "}
              <a href={`mailto:${email}`} className="text-mint-500 underline">
                Contact us
              </a>
              .
            </p>
          )}
        </div>

        <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
          {FAQS.map(([question, answer]) => (
            <details key={question} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink-900">
                {question}
                <span className="ml-4 text-ink-300 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-ink-500">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
