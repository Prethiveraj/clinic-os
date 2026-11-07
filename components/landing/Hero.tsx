import Image from "next/image";
import SearchForm from "@/components/landing/SearchForm";

export default function Hero() {
  const badgeText = process.env.NEXT_PUBLIC_HERO_BADGE_TEXT || "Built for Indian clinics";

  return (
    <section className="bg-white pb-20 pt-32 sm:pb-28 sm:pt-40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20">
        <div>
          <span className="inline-block rounded-full border border-ink-100 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
            {badgeText}
          </span>

          <h1 className="mt-6 text-[2.75rem] font-bold leading-[1.05] tracking-tightest text-ink-900 sm:text-5xl">
            The growth system that knows <span className="text-mint-500">your clinic</span>
          </h1>

          <p className="mt-5 max-w-lg text-lg text-ink-500">
            One place that pulls your Google presence, site health, and reviews together — then
            builds and hosts the website that turns it into appointments.
          </p>

          <div className="mt-9">
            <SearchForm variant="hero" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink-100">
          <Image
            src="/images/hero.jpg"
            alt="A clinician examining a patient"
            width={1100}
            height={733}
            className="aspect-[4/3] w-full object-cover"
            priority
          />
        </div>
      </div>
    </section>
  );
}
