import http from "node:http";
import type { AddressInfo } from "node:net";

/** One local HTTP server standing in for Google, Groq, Turnstile and Supabase during the e2e run. */
export const TURNSTILE_SECRET = "e2e-turnstile-secret";
export const GOOD_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
export const SUPABASE_KEY = "e2e-service-role";
export const BUCKET = "clinic-photos";
export const PLACE_ID = "ChIJe2eTestDentalClinic";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

export type StubLog = { groq: { system: string; user: string; model: string }[]; storage: string[]; turnstile: boolean[] };

export async function startStubs() {
  const files = new Map<string, { body: Buffer; type: string }>();
  const log: StubLog = { groq: [], storage: [], turnstile: [] };
  let blogCalls = 0;
  let origin = "";

  const place = () => ({
    id: PLACE_ID,
    displayName: { text: "Sunrise Dental Care" },
    formattedAddress: "12 Usman Road, T. Nagar, Chennai, Tamil Nadu 600017",
    primaryTypeDisplayName: { text: "Dental clinic" },
    nationalPhoneNumber: "044 2434 0000",
    websiteUri: `${origin}/site/`,
    rating: 4.6,
    userRatingCount: 87,
    businessStatus: "OPERATIONAL",
    regularOpeningHours: { weekdayDescriptions: ["Monday: 9:00 AM – 8:00 PM", "Sunday: Closed"] },
    photos: [{ name: `places/${PLACE_ID}/photos/P1` }],
  });

  const groqAnswer = (system: string, user: string): string => {
    if (system.includes("website content")) {
      return JSON.stringify({
        headline: "Sunrise Dental Care in T. Nagar, Chennai",
        about_copy: "Sunrise Dental Care is a dental clinic on Usman Road in T. Nagar.\n\nThe clinic offers general and preventive dental care.",
        services: ["General dental check-ups", "Preventive care", "Teeth cleaning"],
        seo_meta: { title: "Sunrise Dental Care, T. Nagar, Chennai", description: "Dental clinic on Usman Road, T. Nagar, Chennai." },
        json_ld: { "@context": "https://schema.org", "@type": "Dentist", name: "Sunrise Dental Care" },
      });
    }
    if (system.includes("drafting a reply")) return JSON.stringify({ reply: "Thank you, Asha! We're glad the visit went smoothly." });
    if (system.includes("summarize")) return JSON.stringify({ summary: "Patients mention short waiting times and friendly staff." });
    if (system.includes("SEO blog posts")) {
      blogCalls++;
      // The first blog answer has the wrong shape, to prove the validation retry works end to end.
      if (blogCalls === 1) return JSON.stringify({ title: "Missing fields" });
      const keyword = /Target keyword: (.+)/.exec(user)?.[1] ?? "dental clinic";
      return JSON.stringify({
        title: `Choosing a ${keyword}`,
        slug: "choosing-a-dental-clinic",
        meta_description: `What to look for in a ${keyword}.`,
        intro: `Looking for a ${keyword}? Here is what to consider.\n\nA qualified dentist should assess your needs.`,
        sections: [{ heading: `What a ${keyword} offers`, body: "Most clinics offer check-ups and cleaning." }],
        faq: [{ question: "How often should I see a dentist?", answer: "Many people visit every six months; your dentist will advise you." }],
      });
    }
    if (system.includes("health check")) return JSON.stringify({ ok: true });
    return "{}";
  };

  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks);
    const url = new URL(req.url!, "http://stub");
    const p = url.pathname;
    const send = (status: number, data: unknown, type = "application/json") => {
      res.writeHead(status, { "Content-Type": type });
      res.end(typeof data === "string" || Buffer.isBuffer(data) ? data : JSON.stringify(data));
    };

    // Google Places API (New)
    if (p === "/places.googleapis.com/v1/places:searchText") {
      if (!req.headers["x-goog-api-key"]) return send(403, { error: "no key" });
      if (JSON.parse(body.toString()).textQuery?.includes("google-refuses")) {
        return send(403, { error: { code: 403, message: "The caller does not have permission", status: "PERMISSION_DENIED" } });
      }
      return send(200, { places: [place()] });
    }
    if (p.startsWith(`/places.googleapis.com/v1/places/${PLACE_ID}/photos/`)) return send(200, PNG, "image/png");
    if (p === `/places.googleapis.com/v1/places/${PLACE_ID}`) {
      if (req.headers["x-goog-fieldmask"] === "reviews") {
        return send(200, {
          reviews: [
            { name: "places/x/reviews/r1", authorAttribution: { displayName: "Asha" }, rating: 5, text: { text: "Short wait and very friendly staff." }, publishTime: "2026-10-01T10:00:00Z" },
            { name: "places/x/reviews/r2", authorAttribution: { displayName: "Ravi" }, rating: 3, text: { text: "Good treatment but parking is hard." }, publishTime: "2026-09-15T10:00:00Z" },
          ],
        });
      }
      return send(200, place());
    }
    // PageSpeed Insights
    if (p === "/www.googleapis.com/pagespeedonline/v5/runPagespeed") {
      return send(200, { lighthouseResult: { categories: { performance: { score: 0.42 }, seo: { score: 0.8 }, accessibility: { score: 0.7 } } } });
    }
    // Google autocomplete
    if (p === "/suggestqueries.google.com/complete/search") {
      const q = url.searchParams.get("q") ?? "";
      return send(200, [q, [`${q} near me open now`, `how much does a dental check-up cost in chennai`, `is teeth cleaning painful`]]);
    }
    // Groq
    if (p === "/api.groq.com/openai/v1/chat/completions") {
      if (req.headers.authorization !== "Bearer e2e-groq-key") return send(401, { error: { message: "Invalid API Key" } });
      const payload = JSON.parse(body.toString());
      const system = payload.messages[0].content as string;
      const user = payload.messages[1].content as string;
      log.groq.push({ system, user, model: payload.model });
      return send(200, { choices: [{ message: { content: groqAnswer(system, user) } }] });
    }
    // Turnstile
    if (p === "/challenges.cloudflare.com/turnstile/v0/siteverify") {
      const form = new URLSearchParams(body.toString());
      const ok = form.get("secret") === TURNSTILE_SECRET && form.get("response") === GOOD_TOKEN;
      log.turnstile.push(ok);
      return send(200, ok ? { success: true } : { success: false, "error-codes": ["invalid-input-response"] });
    }
    // Supabase Storage
    const up = p.match(/^\/storage\/v1\/object\/(public\/)?([^/]+)\/(.+)$/);
    if (up) {
      const [, isPublic, bucket, key] = up;
      if (bucket !== BUCKET) return send(404, { message: "Bucket not found" });
      if (isPublic) {
        const f = files.get(key);
        return f ? send(200, f.body, f.type) : send(404, { message: "Object not found" });
      }
      if (req.headers.apikey !== SUPABASE_KEY) return send(403, { message: "Invalid API key" });
      if (req.method === "POST") {
        files.set(key, { body, type: String(req.headers["content-type"]) });
        log.storage.push(key);
        return send(200, { Key: `${bucket}/${key}` });
      }
      if (req.method === "DELETE") return files.delete(key) ? send(200, {}) : send(404, { message: "Object not found" });
    }
    // The clinic's existing website, audited by PageSpeed and the conversion checks
    if (p === "/site/") {
      return send(200, `<html><body><a href="tel:04424340000">Call us</a><form><input name="n"></form></body></html>`, "text/html");
    }
    if (p === "/robots.txt") return send(200, "User-agent: *\nAllow: /\n", "text/plain");
    send(404, { error: `no stub for ${p}` });
  });

  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { origin, log, files, close: () => new Promise<void>((r) => server.close(() => r())) };
}
