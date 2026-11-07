export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`${name} is not set. Add it to .env (local) or the Vercel project's Environment Variables, then restart.`);
  }
}

/** Reads a required environment variable at call time, so a missing key fails loudly where it is used. */
export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new MissingEnvError(name);
  return value;
}

/** Core variables for real discovery, generation and sign-in. Billing, storage and cron are optional modules. */
export const REQUIRED_ENV: Record<string, string[]> = {
  Database: ["DATABASE_URL"],
  Auth: ["NEXTAUTH_SECRET", "NEXTAUTH_URL", "APP_BASE_DOMAIN"],
  Google: ["GOOGLE_PLACES_API_KEY", "GOOGLE_PAGESPEED_API_KEY"],
  "AI (Groq)": ["GROQ_API_KEY"],
  "Email (SMTP)": ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"],

  "Bot protection (Turnstile)": ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "CLOUDFLARE_TURNSTILE_SECRET_KEY"],

};

export function missingEnv(): string[] {
  return Object.values(REQUIRED_ENV)
    .flat()
    .filter((name) => !process.env[name]?.trim());
}

/** Public contact address: CONTACT_EMAIL, else the sending Gmail account. */
export function contactEmail(): string | null {
  return process.env.CONTACT_EMAIL?.trim() || process.env.SMTP_USER?.trim() || null;
}
