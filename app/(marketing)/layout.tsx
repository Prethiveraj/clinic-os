import type { ReactNode } from "react";
import "@/app/globals.css";
import { displayFont } from "@/lib/fonts";
import SessionProvider from "@/components/providers/SessionProvider";

export const metadata = {
  title: "Clinic Growth — see your clinic's growth score",
  description: "Search your clinic, get an instant growth score, and launch an AI-built website in minutes.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={displayFont.variable}>
      <body className="min-h-screen bg-white text-ink-900 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
