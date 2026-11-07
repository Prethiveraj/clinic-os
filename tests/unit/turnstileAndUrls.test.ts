import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { siteBaseUrl } from "@/lib/siteUrl";
import { json, mockFetch, withEnv } from "./helpers";

test("Turnstile posts the secret and token and honours success", withEnv({ CLOUDFLARE_TURNSTILE_SECRET_KEY: "sec" }, async () => {
  const m = mockFetch((_u, init) => json({ success: String(init.body).includes("response=good") }));
  try {
    assert.equal(await verifyTurnstileToken("good", "1.2.3.4"), true);
    assert.equal(await verifyTurnstileToken("bad"), false);
    assert.equal(m.calls[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.match(String(m.calls[0].init.body), /secret=sec&response=good&remoteip=1.2.3.4/);
  } finally {
    m.restore();
  }
}));

test("Turnstile without a secret refuses instead of passing", withEnv({ CLOUDFLARE_TURNSTILE_SECRET_KEY: undefined }, async () => {
  await assert.rejects(verifyTurnstileToken("x"), /CLOUDFLARE_TURNSTILE_SECRET_KEY is not set/);
}));

const settings = { subdomainSlug: "lakshmi", customDomain: null, domainVerified: false };

test("site URLs follow NEXTAUTH_URL locally", withEnv({ NEXTAUTH_URL: "http://localhost:3000", APP_BASE_DOMAIN: "localhost" }, () => {
  assert.equal(siteBaseUrl(settings), "http://lakshmi.localhost:3000");
}));

test("site URLs use https and the verified custom domain in production", withEnv({ NEXTAUTH_URL: "https://clinicgrowth.in", APP_BASE_DOMAIN: "clinicgrowth.in" }, () => {
  assert.equal(siteBaseUrl(settings), "https://lakshmi.clinicgrowth.in");
  assert.equal(siteBaseUrl({ ...settings, customDomain: "lakshmidental.in", domainVerified: true }), "https://lakshmidental.in");
  assert.equal(siteBaseUrl({ ...settings, customDomain: "lakshmidental.in", domainVerified: false }), "https://lakshmi.clinicgrowth.in");
}));
