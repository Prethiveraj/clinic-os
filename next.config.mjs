import { WindowsOutputPlugin } from './scripts/windows-output-plugin.mjs';
/** Clinic photos are served from Supabase Storage; allow exactly that host for next/image. */
function supabaseImagePattern() {
  try {
    const url = new URL(process.env.SUPABASE_URL ?? "");
    return [{ protocol: url.protocol.replace(":", ""), hostname: url.hostname, port: url.port, pathname: "/storage/v1/object/public/**" }];
  } catch {
    return [{ protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" }];
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    if (process.platform === 'win32') config.plugins.push(new WindowsOutputPlugin());
    return config;
  },
  experimental: process.platform === "win32" ? { cpus: 1, webpackBuildWorker: false } : {},
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      ...supabaseImagePattern(),
      { protocol: "https", hostname: "**.googleapis.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
