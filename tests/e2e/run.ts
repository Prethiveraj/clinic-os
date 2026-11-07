/**
 * End-to-end test of the production build (`next build` + `next start`).
 *
 * Real: PostgreSQL, the SMTP protocol (a local SMTP server catches the mail),
 * the Next.js production server, the browser (Playwright/Chromium), Razorpay
 * webhook signatures and every app code path.
 * Stand-ins: Google Places/PageSpeed/autocomplete, Groq, Turnstile and Supabase
 * Storage answer from tests/e2e/stubs.ts, because this test must run without
 * your keys. `npm run verify:integrations` checks those services for real.
 *
 * Needs: a local Postgres whose user can create databases, and E2E_DATABASE_URL
 * pointing at a database name this script may drop and recreate.
 *   E2E_DATABASE_URL=postgresql://user:pass@localhost:5432/cgos_e2e npm run test:e2e
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { SMTPServer } from "smtp-server";
import { chromium, type Page } from "playwright";
import { PrismaClient } from "@prisma/client";
import { BUCKET, GOOD_TOKEN, PLACE_ID, startStubs, SUPABASE_KEY, TURNSTILE_SECRET } from "./stubs";

const ROOT = path.resolve(__dirname, "../..");
const PORT = 3100;
const APP = `http://localhost:${PORT}`;
const OWNER = "owner@e2e.test";
const ADMIN = "admin@e2e.test";
const WEBHOOK_SECRET = "e2e-webhook-secret";
const CRON_SECRET = "e2e-cron-secret";

const dbUrl = process.env.E2E_DATABASE_URL;
if (!dbUrl) {
  console.error("Set E2E_DATABASE_URL (a database this test may drop and recreate).");
  process.exit(2);
}

type Mail = { to: string; subject: string; text: string };
const inbox: Mail[] = [];
const results: { name: string; ok: boolean; detail?: string }[] = [];

async function step(name: string, fn: () => Promise<string | void>) {
  try {
    const detail = (await fn()) || undefined;
    results.push({ name, ok: true, detail });
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (err) {
    const detail = err instanceof Error ? err.message.split("\n")[0] : String(err);
    results.push({ name, ok: false, detail });
    console.log(`  ✗ ${name} — ${detail}`);
  }
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function waitForMail(to: string, subject: RegExp, timeoutMs = 15000): Promise<Mail> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const m = [...inbox].reverse().find((x) => x.to === to && subject.test(x.subject));
    if (m) return m;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no email to ${to} matching ${subject}; inbox: ${inbox.map((m) => `${m.to}: ${m.subject}`).join(" | ") || "empty"}`);
}

function decodeQuotedPrintable(raw: string): string {
  return raw.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Decodes RFC 2047 encoded-words (=?UTF-8?Q?...?= / =?UTF-8?B?...?=) in a header, as mail clients do. */
function decodeHeader(value: string): string {
  return value
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?UTF-8\?([QB])\?([^?]*)\?=/gi, (_, enc, text) =>
      enc.toUpperCase() === "B"
        ? Buffer.from(text, "base64").toString("utf8")
        : Buffer.from(decodeQuotedPrintable(text.replace(/_/g, " ")), "latin1").toString("utf8")
    );
}

async function startSmtp() {
  const server = new SMTPServer({
    secure: false,
    disabledCommands: ["STARTTLS"],
    allowInsecureAuth: true,
    onAuth(auth, _s, cb) {
      if (auth.username === "e2e@gmail.com" && auth.password === "e2e-app-password") return cb(null, { user: auth.username });
      cb(new Error("535 Invalid login"));
    },
    onData(stream, session, cb) {
      let raw = "";
      stream.on("data", (c) => (raw += c));
      stream.on("end", () => {
        const header = raw.slice(0, raw.indexOf("\r\n\r\n")).replace(/\r\n[ \t]+/g, " ");
        const subject = decodeHeader(/^Subject: (.*)$/m.exec(header)?.[1]?.trim() ?? "");
        const bodyStart = raw.indexOf("\r\n\r\n");
        const text = decodeQuotedPrintable(raw.slice(bodyStart + 4));
        for (const r of session.envelope.rcptTo) inbox.push({ to: r.address, subject, text });
        cb();
      });
    },
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  return { port: (server.server.address() as AddressInfo).port, close: () => new Promise<void>((r) => server.close(() => r())) };
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv, label: string) {
  const r = spawnSync(cmd, args, { cwd: ROOT, env, encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stdout?.slice(-3000), r.stderr?.slice(-3000));
    throw new Error(`${label} failed`);
  }
  return r.stdout;
}

function recreateDatabase() {
  const url = new URL(dbUrl!);
  const name = url.pathname.slice(1);
  assert(/^[a-z0-9_]+$/.test(name), "database name must be lowercase letters, digits or _");
  const admin = new URL(dbUrl!);
  admin.pathname = "/postgres";
  const prisma = new PrismaClient({ datasources: { db: { url: admin.toString() } } });
  return (async () => {
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    await prisma.$disconnect();
  })();
}

async function waitForServer(url: string, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server at ${url} did not start`);
}

/** Stands in for the Cloudflare widget script in the browser; the server still verifies the token. */
async function fakeTurnstileScript(page: Page, token = GOOD_TOKEN) {
  await page.route("https://challenges.cloudflare.com/turnstile/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile={render:function(el,o){setTimeout(function(){o.callback(${JSON.stringify(token)})},50);return "w1"},remove:function(){}};`,
    })
  );
}

async function signIn(page: Page, email: string, next: string) {
  await page.goto(`${APP}/login?next=${encodeURIComponent(next)}`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]');
  const mail = await waitForMail(email, /sign-in code/);
  const code = /code is (\d{6})/.exec(mail.text)?.[1];
  assert(code, "no code in the email");
  await page.fill('input[autocomplete="one-time-code"]', code);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname === next.split("?")[0], { timeout: 20000 });
  return code;
}

async function main() {
  console.log("Setting up: database, SMTP server, API stand-ins");
  await recreateDatabase();
  const smtp = await startSmtp();
  const stubs = await startStubs();

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: dbUrl,
    NEXTAUTH_URL: APP,
    NEXTAUTH_SECRET: crypto.randomBytes(32).toString("base64"),
    APP_BASE_DOMAIN: "localhost",
    CRON_SECRET,
    SEED_ADMIN_EMAIL: ADMIN,
    GOOGLE_PLACES_API_KEY: "e2e-google-key",
    GOOGLE_PAGESPEED_API_KEY: "e2e-google-key",
    GROQ_API_KEY: "e2e-groq-key",
    GROQ_MODEL: "",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(smtp.port),
    SMTP_USER: "e2e@gmail.com",
    SMTP_PASS: "e2e-app-password",
    EMAIL_FROM: "Clinic Growth <e2e@gmail.com>",
    SUPABASE_URL: stubs.origin,
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY,
    SUPABASE_STORAGE_BUCKET: BUCKET,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "e2e-site-key",
    CLOUDFLARE_TURNSTILE_SECRET_KEY: TURNSTILE_SECRET,
    RAZORPAY_KEY_ID: "rzp_test_e2e",
    RAZORPAY_KEY_SECRET: "e2e-razorpay-secret",
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    RAZORPAY_PLAN_STARTER: "plan_e2e_starter",
    RAZORPAY_PLAN_GROWTH: "plan_e2e_growth",
  };

  run("npx", ["prisma", "migrate", "deploy"], env, "migrate");
  run("npx", ["tsx", "prisma/seed.ts"], env, "seed");
  // Never reuse responses cached by an earlier run.
  spawnSync("rm", ["-rf", path.join(ROOT, ".next/cache/fetch-cache")]);
  if (!process.env.E2E_SKIP_BUILD) {
    console.log("Building the production bundle (next build)…");
    run("npm", ["run", "build"], env, "build");
  }

  const preload = path.join(__dirname, "redirect-fetch.mjs");
  const server: ChildProcess = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], {
    cwd: ROOT,
    env: { ...env, E2E_STUB_ORIGIN: stubs.origin, NODE_OPTIONS: `--import ${preload}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout!.on("data", (d) => (serverLog += d));
  server.stderr!.on("data", (d) => (serverLog += d));
  const stopServer = () => {
    if (server.exitCode === null) server.kill("SIGTERM");
  };
  process.on("exit", stopServer);
  await waitForServer(APP);

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(`${page.url()}: ${e.name}: ${e.message} ${(e.stack ?? "").split("\n").slice(0, 3).join(" ")}`));
  page.on("console", (m) => {
    if (m.type() === "error") pageErrors.push(`${page.url()}: console: ${m.text().slice(0, 300)}`);
  });
  await fakeTurnstileScript(page);

  console.log("\nRunning checks against the production server:");
  let clinicId = "";
  let slug = "";

  await step("Home page has no demo shortcuts or made-up stats/testimonials", async () => {
    const res = await page.goto(APP, { waitUntil: "networkidle" });
    assert(res?.status() === 200, `status ${res?.status()}`);
    const html = await page.content();
    for (const banned of ["live example", "Lakshmi", "Clinics growing with us", "Clinics scored", "Turnstile not configured", "yourbrand.in"]) {
      assert(!html.includes(banned), `found "${banned}"`);
    }
    assert(await page.locator('input[placeholder="Clinic name + city"]').first().isVisible(), "no search box");
  });

  await step("Search rejects a request without a valid bot-check token", async () => {
    const r = await page.request.post(`${APP}/api/clinics/search`, { data: { query: "Sunrise Dental", turnstileToken: "forged" } });
    assert(r.status() === 400, `status ${r.status()}`);
  });

  await step("If Google refuses the key, search answers 502 with a clear message (not a crash)", async () => {
    const r = await page.request.post(`${APP}/api/clinics/search`, { data: { query: "google-refuses clinic", turnstileToken: GOOD_TOKEN } });
    const data = await r.json();
    assert(r.status() === 502 && /couldn't reach Google/.test(data.error), `${r.status()} ${JSON.stringify(data)}`);
  });

  await step("Audit: search → Places + PageSpeed + site checks → Growth Report", async () => {
    await page.goto(APP, { waitUntil: "networkidle" });
    await page.locator('input[placeholder="Clinic name + city"]').first().fill("Sunrise Dental Care Chennai");
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Find my clinic")').first().click();
    await page.locator("button").filter({hasText:"Audit this clinic"}).first().click();
    await page.waitForURL(/\/clinic\//, { timeout: 60000 });
    clinicId = page.url().split("/clinic/")[1].split(/[?#]/)[0];
    await page.waitForLoadState("networkidle");
    assert((await page.content()).includes("Sunrise Dental Care"), "clinic name missing on report");
    const score = await prisma.score.findFirst({ where: { clinicId }, orderBy: { computedAt: "desc" } });
    assert(score?.overallScore === 85, `expected score 85, got ${score?.overallScore}`);
    const check = await prisma.siteHealthCheck.findFirst({ where: { clinicId } });
    const conv = check?.conversionChecks as Record<string, boolean>;
    assert(conv?.hasPhoneLink && conv?.hasContactForm, "conversion checks did not read the site");
    return `score ${score.overallScore}/100`;
  });

  await step("Discovery keeps Google photos out of permanent storage", async () => {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    assert(Array.isArray(clinic?.photos) && clinic.photos.length === 0, "Google photos were mirrored");
    assert(clinic?.name === "Unclaimed clinic", "Unconfirmed Google facts were persisted");
  });

  await step("Email login: wrong code is rejected", async () => {
    await page.goto(`${APP}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', OWNER);
    await page.waitForTimeout(300);
    await page.click('button[type="submit"]');
    await waitForMail(OWNER, /sign-in code/);
    await page.fill('input[autocomplete="one-time-code"]', "000000");
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=Invalid or expired code", { timeout: 10000 });
    inbox.length = 0;
  });

  let usedCode = "";
  await step("Email login: code arrives over SMTP and signs the owner in", async () => {
    usedCode = await signIn(page, OWNER, `/clinic/${clinicId}`);
    return `code ${usedCode} delivered`;
  });

  await step("A sign-in code works only once", async () => {
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    const csrf = await (await p2.request.get(`${APP}/api/auth/csrf`)).json();
    const r = await p2.request.post(`${APP}/api/auth/callback/otp`, {
      form: { email: OWNER, code: usedCode, csrfToken: csrf.csrfToken, json: "true" },
    });
    const session = await (await p2.request.get(`${APP}/api/auth/session`)).json();
    await ctx2.close();
    assert(!session?.user, `reused code signed in (status ${r.status()})`);
  });

  await step("AI site generation with Groq (gpt-oss-120b)", async () => {
    await page.locator('textarea[name="services"]').fill('General dental check-ups\nPreventive care\nTeeth cleaning');
    await page.locator('input[type="checkbox"]').check();
    await page.locator('button:has-text("Confirm & generate website")').click();
    await page.waitForSelector("text=Sunrise Dental Care in T. Nagar, Chennai", { timeout: 30000 });
    const content = await prisma.siteContent.findUnique({ where: { clinicId } });
    assert(content, "no site content saved");
    const settings = await prisma.siteSettings.findUnique({ where: { clinicId } });
    slug = settings!.subdomainSlug;
    const call = stubs.log.groq.find((g) => g.system.includes("website content"));
    assert(call?.model === "openai/gpt-oss-120b", `model ${call?.model}`);
    const owner = await prisma.user.findUnique({ where: { email: OWNER } });
    assert(owner?.clinicId === clinicId, "owner not linked to clinic");
    return `site at ${slug}.localhost`;
  });

  await step("Clinic website renders on its subdomain with confirmed services", async () => {
    const res = await page.goto(`http://${slug}.localhost:${PORT}/`, { waitUntil: "networkidle" });
    assert(res?.status() === 200, `status ${res?.status()}`);
    assert((await page.content()).includes("Sunrise Dental Care in T. Nagar, Chennai"), "headline missing");
    assert((await page.content()).includes("General dental check-ups"), "confirmed service missing");
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    assert(robots?.includes('noindex'), 'draft must not be indexed');
  });

  await step("Razorpay webhook: bad signature rejected, valid one activates the clinic", async () => {
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: OWNER } });
    await prisma.subscription.create({
      data: { userId: owner.id, clinicId, razorpaySubscriptionId: "sub_e2e_1", planTier: "starter", status: "past_due" },
    });
    const body = JSON.stringify({
      event: "subscription.activated",
      payload: { subscription: { entity: { id: "sub_e2e_1", current_end: Math.floor(Date.now() / 1000) + 30 * 86400 } } },
    });
    const bad = await page.request.post(`${APP}/api/webhooks/razorpay`, { data: body, headers: { "content-type": "application/json", "x-razorpay-signature": "deadbeef" } });
    assert(bad.status() === 400, `bad signature got ${bad.status()}`);
    const sig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    const ok = await page.request.post(`${APP}/api/webhooks/razorpay`, { data: body, headers: { "content-type": "application/json", "x-razorpay-signature": sig } });
    assert(ok.status() === 200, `valid signature got ${ok.status()}`);
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, include: { siteSettings: true } });
    assert(clinic?.status === "live" && clinic.siteSettings?.status === "live", `clinic ${clinic?.status}, site ${clinic?.siteSettings?.status}`);
  });

  await step("Patient contact form creates a lead shown in the dashboard", async () => {
    await page.goto(`http://${slug}.localhost:${PORT}/`, { waitUntil: "networkidle" });
    await page.fill('input[name="name"]', "Meena K");
    await page.fill('input[name="phone"]', "9840000000");
    await page.fill('textarea[name="message"]', "Need a check-up appointment");
    await page.click('button:has-text("Send message")');
    await page.waitForSelector("text=we'll be in touch", { timeout: 10000 });
    await page.goto(`${APP}/dashboard/leads`, { waitUntil: "networkidle" });
    assert((await page.content()).includes("Meena K"), "lead not in dashboard");
  });

  await step("Reviews: sync from Google, AI reply draft, sentiment summary", async () => {
    const sync = await (await page.request.post(`${APP}/api/dashboard/reviews/sync`)).json();
    assert(sync.count === 2, `synced ${JSON.stringify(sync)}`);
    const review = await prisma.review.findFirstOrThrow({ where: { clinicId, authorName: "Asha" } });
    const reply = await (await page.request.post(`${APP}/api/dashboard/reviews/${review.id}/reply`)).json();
    assert(JSON.stringify(reply).includes("Thank you, Asha"), `reply ${JSON.stringify(reply)}`);
    const sentiment = await (await page.request.post(`${APP}/api/dashboard/reviews/sentiment`)).json();
    assert(JSON.stringify(sentiment).includes("friendly staff"), `sentiment ${JSON.stringify(sentiment)}`);
  });

  let postSlug = "";
  await step("Cron endpoints refuse requests without CRON_SECRET", async () => {
    for (const p of ["/api/cron/blog-drafts", "/api/cron/photo-reminders"]) {
      const none = await page.request.get(`${APP}${p}`);
      const wrong = await page.request.get(`${APP}${p}`, { headers: { authorization: "Bearer nope" } });
      assert(none.status() === 401 && wrong.status() === 401, `${p}: ${none.status()}/${wrong.status()}`);
    }
  });

  await step("Weekly blog cron drafts a post (Groq retry on bad JSON) and emails the owner", async () => {
    const r = await page.request.get(`${APP}/api/cron/blog-drafts`, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
    const data = await r.json();
    assert(r.status() === 200 && data.eligible === 1 && /drafted/.test(data.results[0].outcome), JSON.stringify(data));
    const blogCalls = stubs.log.groq.filter((g) => g.system.includes("SEO blog posts"));
    assert(blogCalls.length === 2, `expected 2 Groq calls (1 retry), got ${blogCalls.length}; all: ${stubs.log.groq.map((g) => g.system.slice(0, 40)).join(" | ")}`);
    const post = await prisma.blogPost.findFirstOrThrow({ where: { clinicId } });
    assert(post.status === "pending_approval", post.status);
    assert(post.keywordSource === "google_autocomplete", post.keywordSource);
    postSlug = post.slug;
    await waitForMail(OWNER, /blog post|draft/i);
    const again = await (await page.request.get(`${APP}/api/cron/blog-drafts`, { headers: { authorization: `Bearer ${CRON_SECRET}` } })).json();
    assert(again.eligible === 0, "a second run drafted again");
    return `"${post.title}"`;
  });

  await step("Unapproved post is not public; owner approves it in the dashboard; then it is", async () => {
    const before = await page.goto(`http://${slug}.localhost:${PORT}/blog/${postSlug}`);
    assert(before?.status() === 404, `before approval: ${before?.status()}`);
    await page.goto(`${APP}/dashboard/blog`, { waitUntil: "networkidle" });
    await page.locator('button:has-text("Approve & publish")').first().click();
    await page.waitForSelector("text=Published on your website (1)", { timeout: 15000 });
    const after = await page.goto(`http://${slug}.localhost:${PORT}/blog/${postSlug}`, { waitUntil: "networkidle" });
    assert(after?.status() === 200, `after approval: ${after?.status()}`);
    const html = await page.content();
    assert(html.includes('"@type":"BlogPosting"') && html.includes('"@type":"FAQPage"'), "structured data missing");
    const sitemap = await page.goto(`http://${slug}.localhost:${PORT}/sitemap.xml`);
    assert((await sitemap!.text()).includes(`/blog/${postSlug}`), "post missing from sitemap");
  });

  await step("Weekly photo reminder: emailed once per week, never twice", async () => {
    const first = await (await page.request.get(`${APP}/api/cron/photo-reminders`, { headers: { authorization: `Bearer ${CRON_SECRET}` } })).json();
    assert(first.sent === 1 && first.failed === 0, JSON.stringify(first));
    await waitForMail(OWNER, /photos/i);
    const second = await (await page.request.get(`${APP}/api/cron/photo-reminders`, { headers: { authorization: `Bearer ${CRON_SECRET}` } })).json();
    assert(second.sent === 0 && second.alreadySent === 1, JSON.stringify(second));
  });

  await step("Unknown clinic host and unknown paths show a clean 404", async () => {
    const before = pageErrors.length;
    const a = await page.goto(`http://no-such-clinic.localhost:${PORT}/`, { waitUntil: "networkidle" });
    const b = await page.goto(`${APP}/definitely-not-a-page`, { waitUntil: "networkidle" });
    assert(a?.status() === 404 && b?.status() === 404, `statuses ${a?.status()} / ${b?.status()}`);
    const errors = pageErrors.slice(before).filter((e) => !e.includes("status of 404"));
    pageErrors.length = before;
    assert(errors.length === 0, errors.join(" | "));
  });

  await step("Dashboard APIs require a session", async () => {
    const anon = await browser.newContext();
    const r = await anon.request.get(`${APP}/api/dashboard/overview`);
    await anon.close();
    assert(r.status() === 401, `status ${r.status()}`);
  });

  await step("Admin (from db:seed) signs in by email and sees the clinic", async () => {
    const actx = await browser.newContext();
    const ap = await actx.newPage();
    await fakeTurnstileScript(ap);
    await signIn(ap, ADMIN, "/admin");
    const ok = await ap.waitForSelector("text=Sunrise Dental Care", { timeout: 15000 }).then(() => true, () => false);
    await actx.close();
    assert(ok, "clinic not listed in admin");
  });

  await step("No browser errors on any page", async () => {
    const expected = /status of (401|404)/; // the deliberate wrong-code sign-in and unpublished-post checks
    const real = pageErrors.filter((e) => !expected.test(e));
    assert(real.length === 0, real.join(" | "));
  });

  await browser.close();
  await prisma.$disconnect();
  stopServer();
  await Promise.all([smtp.close(), stubs.close()]);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log("\nServer log (last 4000 chars):\n" + serverLog.slice(-4000));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
