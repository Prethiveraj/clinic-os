const ROWS: [string, boolean | string, boolean | string][] = [
  ["Knows your actual clinic data", true, "Generic prompting, you re-explain every time"],
  ["Takes action — builds a live site, tracks your score", true, "Only gives advice"],
  ["Covers search, reviews, and booking in one place", true, "Piecemeal — you stitch tools together"],
  ["Shows a measurable score and change over time", true, "No way to measure progress"],
  ["Cost for one clinic", "A single monthly subscription", "Project fees plus ongoing retainers"],
];

function Cell({ value, emphasized }: { value: boolean | string; emphasized: boolean }) {
  if (typeof value === "boolean") {
    return (
      <span className={emphasized ? "text-mint-500" : "text-ink-300"}>
        {value ? "✓" : "—"}
      </span>
    );
  }
  return <span className={emphasized ? "text-ink-900" : "text-ink-400"}>{value}</span>;
}

export default function ComparisonTable() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold text-ink-900 sm:text-4xl">
          A generic AI can write your website copy. <span className="text-mint-500">We run your growth.</span>
        </h2>
        <p className="mt-4 text-center text-ink-500">
          Compared against the two things clinic owners actually try first.
        </p>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[560px] overflow-hidden rounded-2xl border border-ink-100 bg-white text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="px-5 py-4 font-medium text-ink-400"></th>
                <th className="rounded-t-2xl bg-ink-900 px-5 py-4 text-base font-bold text-white">
                  Clinic Growth
                </th>
                <th className="px-5 py-4 font-medium text-ink-400">DIY chatbot / agency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {ROWS.map(([label, ours, theirs]) => (
                <tr key={label}>
                  <td className="px-5 py-4 text-ink-700">{label}</td>
                  <td className="bg-mint-50/60 px-5 py-4">
                    <Cell value={ours} emphasized />
                  </td>
                  <td className="px-5 py-4">
                    <Cell value={theirs} emphasized={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
