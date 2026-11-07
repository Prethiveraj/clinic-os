"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

/** Cloudflare Turnstile bot check, used on the public search form and the login form. */
export default function TurnstileWidget({ onVerify }: { onVerify: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  function render() {
    if (!siteKey || !ref.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: siteKey,
      callback: (token: string) => onVerify(token),
      "expired-callback": () => onVerify(null),
      "error-callback": () => onVerify(null),
    });
  }

  useEffect(() => {
    render();
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) {
    // A build without the key is misconfigured; say so instead of silently skipping the check.
    return <p className="text-sm text-red-600">Verification unavailable: NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set.</p>;
  }

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} />
      <div ref={ref} />
    </>
  );
}
