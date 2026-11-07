"use client";

import { useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function CheckoutButton({
  clinicId,
  planTier,
  clinicName,
}: {
  clinicId: string;
  planTier: "starter" | "growth";
  clinicName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, planTier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");

      if (!window.Razorpay) throw new Error("Payment SDK still loading — try again in a moment.");

      const rzp = new window.Razorpay({
        key: data.razorpayKeyId,
        subscription_id: data.subscriptionId,
        name: "Clinic Growth",
        description: `${clinicName} — ${planTier} plan`,
        theme: { color: "#1FB579" },
        handler: () => {
          window.location.reload();
        },
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="rounded-full bg-ink-900 px-6 py-3 font-semibold text-white transition hover:bg-ink-700 disabled:opacity-50"
      >
        {loading ? "Starting checkout…" : `Activate — ${planTier} plan`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
