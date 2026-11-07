"use client";

import { useState } from "react";

export default function ContactForm({ clinicId }: { clinicId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("sending");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          name: data.get("name"),
          phone: data.get("phone"),
          message: data.get("message"),
          source: "contact_form",
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return <p className="rounded-lg bg-green-50 p-4 text-green-800">Thanks — we'll be in touch shortly.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Phone</label>
        <input name="phone" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Message</label>
        <textarea name="message" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
      {status === "error" && <p className="text-sm text-red-600">Something went wrong — please try again.</p>}
    </form>
  );
}
