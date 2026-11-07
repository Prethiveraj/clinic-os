/**
 * Calls every live service with the keys in .env and reports what works.
 * Run: npm run verify:integrations            (sends a test email to SMTP_USER)
 *      npm run verify:integrations -- you@x.com (sends it there instead)
 */
import "dotenv/config";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { missingEnv } from "@/lib/env";
import { searchPlaceByText } from "@/lib/places";
import { getPageSpeedScores } from "@/lib/pagespeed";
import { groqJson, groqModel } from "@/lib/groq";
import { getTransporter, sendEmail } from "@/lib/email";
import { deleteFile, uploadFile } from "@/lib/storage";
import { getRazorpayClient } from "@/lib/razorpay";

type Check = { name: string; run: () => Promise<string>; fix: string };

const checks: Check[] = [
  {
    name: "PostgreSQL",
    fix: "Check DATABASE_URL, that Postgres is running, then run: npx prisma migrate deploy",
    run: async () => {
      await prisma.$queryRaw`SELECT 1`;
      const pending = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "_prisma_migrations" WHERE finished_at IS NULL`;
      if (Number(pending[0]?.n ?? 0) > 0) throw new Error("a migration did not finish");
      const users = await prisma.user.count({ where: { role: "admin" } });
      return users ? `connected, ${users} admin user(s)` : "connected (no admin yet: run npm run db:seed)";
    },
  },
  {
    name: "Google Places API (New)",
    fix: "Enable 'Places API (New)' for the key's project, link billing, and check key restrictions",
    run: async () => {
      const results = await searchPlaceByText("Apollo Hospitals Greams Road Chennai");
      if (!results.length) throw new Error("no results returned");
      return `found "${results[0].name}"`;
    },
  },
  {
    name: "Google PageSpeed Insights",
    fix: "Enable 'PageSpeed Insights API' for the key's project",
    run: async () => {
      const r = await getPageSpeedScores("https://example.com");
      return `performance ${r.performance}, seo ${r.seo}, accessibility ${r.accessibility}`;
    },
  },
  {
    name: `Groq (${groqModel()})`,
    fix: "Create a key at console.groq.com/keys; check GROQ_MODEL and quota",
    run: async () => {
      const r = await groqJson({
        system: "You are a health check. Answer in JSON.",
        user: "Reply with ok set to true.",
        shape: `{ "ok": boolean }`,
        schema: z.object({ ok: z.boolean() }),
      });
      if (!r.ok) throw new Error("model answered ok=false");
      return "model answered with valid JSON";
    },
  },
  {
    name: "Gmail SMTP",
    fix: "Use a 16-character App Password (2-Step Verification must be on), SMTP_HOST=smtp.gmail.com, SMTP_PORT=465",
    run: async () => {
      await getTransporter().verify();
      const to = process.argv[2] || process.env.SMTP_USER!;
      const r = await sendEmail({ to, subject: "Clinic Growth: SMTP test", text: "If you can read this, email sending works." });
      if (!r.delivered) throw new Error(r.error);
      return `login OK, test email sent to ${to}`;
    },
  },
  {
    name: "Supabase Storage",
    fix: "Check SUPABASE_URL, use the service_role key, create the bucket and mark it Public",
    run: async () => {
      const path = `healthcheck/verify-${Date.now()}.txt`;
      const url = await uploadFile({ path, body: Buffer.from("ok"), contentType: "text/plain" });
      const res = await fetch(url);
      await deleteFile(path);
      if (!res.ok) throw new Error(`uploaded, but the public URL returned ${res.status} (is the bucket Public?)`);
      return "upload, public read and delete OK";
    },
  },
  {
    name: "Cloudflare Turnstile",
    fix: "Copy the Secret Key from Cloudflare → Turnstile → your widget → Settings",
    run: async () => {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY!, response: "verify-script-dummy-token" }),
      });
      const data = (await res.json()) as { "error-codes"?: string[] };
      const codes = data["error-codes"] ?? [];
      if (codes.includes("invalid-input-secret")) throw new Error("secret key rejected");
      return "secret key accepted (a real token is checked when someone uses the form)";
    },
  },
  {
    name: "Razorpay",
    fix: "Check RAZORPAY_KEY_ID/SECRET are a matching pair (same Test or Live mode as the plans) and the plan ids",
    run: async () => {
      const rp = getRazorpayClient();
      const [a, b] = await Promise.all([
        rp.plans.fetch(process.env.RAZORPAY_PLAN_STARTER!),
        rp.plans.fetch(process.env.RAZORPAY_PLAN_GROWTH!),
      ]);
      const mode = process.env.RAZORPAY_KEY_ID!.startsWith("rzp_live_") ? "LIVE" : "TEST";
      return `${mode} mode, plans "${a.item.name}" and "${b.item.name}" found`;
    },
  },
];

async function main() {
  const missing = missingEnv();
  if (missing.length) {
    console.log(`Missing variables: ${missing.join(", ")}\nFill them in first (npm run check:env).\n`);
  }

  let failed = 0;
  for (const check of checks) {
    process.stdout.write(`… ${check.name}`);
    try {
      const detail = await check.run();
      process.stdout.write(`\r✓ ${check.name}: ${detail}\n`);
    } catch (err) {
      failed++;
      const message = (err instanceof Error ? err.message : JSON.stringify(err)).slice(0, 300);
      process.stdout.write(`\r✗ ${check.name}: ${message}\n    fix: ${check.fix}\n`);
    }
  }

  await prisma.$disconnect();
  console.log(failed ? `\n${failed} check(s) failed.` : "\nAll integrations work.");
  process.exit(failed ? 1 : 0);
}

main();
