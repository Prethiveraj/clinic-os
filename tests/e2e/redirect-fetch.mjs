// Test-only: loaded with `node --import` into the app server by tests/e2e/run.ts.
// It sends calls for third-party APIs this sandbox can't reach to the local
// stand-in server. The app itself contains no test hooks.
const origin = process.env.E2E_STUB_ORIGIN;
const HOSTS = new Set([
  "places.googleapis.com",
  "www.googleapis.com",
  "suggestqueries.google.com",
  "api.groq.com",
  "challenges.cloudflare.com",
]);
if (origin) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = function (input, init) {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (HOSTS.has(url.hostname)) {
      const target = `${origin}/${url.hostname}${url.pathname}${url.search}`;
      if (input instanceof Request) return realFetch(new Request(target, input), init);
      return realFetch(target, init);
    }
    return realFetch(input, init);
  };
}
