import Image from "next/image";

type Row = {
  eyebrow: string;
  heading: string;
  body: string;
  src: string;
  alt: string;
  aspect?: string;
};

const ROWS: Row[] = [
  {
    eyebrow: "Visibility",
    heading: "Turn nearby searches into appointment requests",
    body: "The score engine surfaces exactly what's holding your clinic back in local search — and what's already working — so nearby searches find you first.",
    src: "/images/clinic-growth.jpg",
    alt: "Clinic staff reviewing their growth score together",
    aspect: "aspect-[3/4]",
  },
  {
    eyebrow: "Conversion",
    heading: "Go from lead to booked appointment without the back-and-forth",
    body: "Click-to-call, WhatsApp, and a contact form are built into every site from day one, so a visitor can reach you the moment they decide to.",
    src: "/images/appointment-booking.jpg",
    alt: "Clinic staff confirming an appointment booking",
  },
  {
    eyebrow: "Retention",
    heading: "Keep track of who's due for a follow-up",
    body: "Convert a lead into a patient with one click and log their last visit yourself — a simple way to see who hasn't been back in a while.",
    src: "/images/lead-management.jpg",
    alt: "A clinic team member managing patient leads",
  },
];

export default function AlternatingRows() {
  return (
    <section className="bg-white px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl space-y-24">
        {ROWS.map((row, i) => {
          const imageFirst = i % 2 === 1;
          return (
            <div key={row.heading} className="grid items-center gap-10 sm:grid-cols-2 sm:gap-14">
              <div className={imageFirst ? "sm:order-2" : ""}>
                <p className="text-xs font-semibold uppercase tracking-wide text-mint-500">{row.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-bold tracking-tightest text-ink-900 sm:text-3xl">
                  {row.heading}
                </h3>
                <p className="mt-4 text-ink-500">{row.body}</p>
              </div>
              <div className={imageFirst ? "sm:order-1" : ""}>
                <div className="overflow-hidden rounded-2xl border border-ink-100">
                  <Image
                    src={row.src}
                    alt={row.alt}
                    width={800}
                    height={600}
                    className={`${row.aspect ?? "aspect-[4/3]"} w-full object-cover`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
