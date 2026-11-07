import { requireEnv } from "@/lib/env";

/** Cloudflare Turnstile server-side verification. */
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const body = new URLSearchParams({ secret: requireEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY"), response: token });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
  if (!data.success) console.warn("[turnstile] rejected:", data["error-codes"]?.join(", "));
  return data.success === true;
}
