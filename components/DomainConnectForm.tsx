"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DomainConnectForm({
  currentDomain,
  verified,
  baseDomain,
}: {
  currentDomain: string | null;
  verified: boolean;
  baseDomain: string;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState(currentDomain ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(!!currentDomain);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to connect domain");
      setConnected(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/domains/verify");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      if (!data.verified) {
        setError("DNS not resolving yet — this can take a few minutes to a few hours to propagate.");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (verified) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-green-800">
        <span className="font-medium">{currentDomain}</span> is connected and verified.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!connected ? (
        <form onSubmit={handleConnect} className="flex gap-2">
          <input
            type="text"
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="www.yourclinic.com"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Connect
          </button>
        </form>
      ) : (
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">
            Add this CNAME record at your domain registrar, then click verify:
          </p>
          <div className="mt-3 rounded-md bg-slate-50 p-3 font-mono text-sm">
            {domain} → {baseDomain}
          </div>
          <button
            onClick={handleVerify}
            disabled={loading}
            className="mt-4 rounded-lg bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Verify domain"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
