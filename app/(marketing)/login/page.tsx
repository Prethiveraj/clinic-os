"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import TurnstileWidget from "@/components/TurnstileWidget";
import { LoginIllustration } from "@/components/illustrations";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Please complete the verification challenge.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send code");
      setStep("code");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("otp", { email, code, redirect: false });
      if (res?.error) throw new Error("Invalid or expired code");
      router.push(next);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12">
        <Link href="/" className="text-lg font-bold text-ink-900">
          Clinic<span className="text-mint-500">Growth</span>
        </Link>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="text-3xl font-bold text-ink-900">Welcome back</h1>
            <p className="mt-2 text-ink-500">We&apos;ll email you a one-time code — no password needed.</p>

            {step === "email" ? (
              <form onSubmit={handleSendCode} className="mt-8 space-y-4">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.com"
                  className="w-full rounded-xl border border-ink-200 px-4 py-3 text-ink-900 placeholder:text-ink-400 focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-500/30"
                />
                <TurnstileWidget onVerify={setToken} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-mint-500 px-5 py-3 font-semibold text-white transition hover:bg-mint-600 disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="mt-8 space-y-4">
                <p className="text-sm text-ink-700">Enter the 6-digit code sent to {email}.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-xl border border-ink-200 px-4 py-3 tracking-widest text-ink-900 focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-500/30"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-mint-500 px-5 py-3 font-semibold text-white transition hover:bg-mint-600 disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify & continue"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-mint-50 lg:block">
        <LoginIllustration className="absolute inset-0 h-full w-full object-cover" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
