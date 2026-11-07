import nodemailer, { type Transporter } from "nodemailer";
import { requireEnv } from "@/lib/env";

export type SendResult = { delivered: boolean; error?: string };

export function appUrl(path = ""): string {
  const base = requireEnv("NEXTAUTH_URL").replace(/\/$/, "");
  return `${base}${path}`;
}

let transporter: Transporter | null = null;

/** SMTP transport (Gmail by default: smtp.gmail.com, port 465, an App Password). */
export function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(requireEnv("SMTP_PORT"));
    transporter = nodemailer.createTransport({
      host: requireEnv("SMTP_HOST"),
      port,
      secure: port === 465,
      auth: { user: requireEnv("SMTP_USER"), pass: requireEnv("SMTP_PASS") },
    });
  }
  return transporter;
}

/** Sends one plain-text email. Never throws: callers record the result. */
export async function sendEmail(params: { to: string; subject: string; text: string }): Promise<SendResult> {
  try {
    await getTransporter().sendMail({
      from: requireEnv("EMAIL_FROM"),
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    return { delivered: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[email] to ${params.to} failed: ${error}`);
    return { delivered: false, error };
  }
}
