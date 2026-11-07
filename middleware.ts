import { NextRequest, NextResponse } from "next/server";

const APP_BASE_DOMAIN = (process.env.APP_BASE_DOMAIN ?? "localhost").toLowerCase();

function isAppHost(hostname: string): boolean {
  return (
    hostname === APP_BASE_DOMAIN ||
    hostname === `www.${APP_BASE_DOMAIN}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".vercel.app")
  );
}

/**
 * Requirements §8: the renderer resolves the incoming Host header (subdomain
 * or custom domain) to a clinic, sharing one render path regardless of hostname.
 * Any host that isn't the marketing app itself is a clinic's public site —
 * rewrite it into the shared renderer at /sites/[[...site]], which re-reads
 * the original Host header via headers() to do the actual clinic lookup.
 * (Not named "_sites": Next.js treats leading-underscore folders under app/
 * as private and excludes them from routing entirely.)
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();

  if (isAppHost(hostname)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/sites${req.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Exclude _next internals, API routes, and any path with a file extension
  // (favicon.ico, /screenshots/*.png, robots.txt, etc.) — static assets must
  // never be rewritten into the per-host clinic-site renderer, and Next's
  // own image optimizer fetches these internally on every request.
  // /sitemap.xml is the one exception: each clinic site serves its own.
  matcher: ["/((?!_next|api|.*\\..*).*)", "/sitemap.xml", "/robots.txt"],
};
