import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 6;

export class OtpDeliveryError extends Error {}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

/** Emails a one-time sign-in code and stores only its hash. */
export async function sendOtp(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const code = generateCode();

  const record = await prisma.otpCode.create({
    data: { identifier: email, codeHash: hashCode(code), expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000) },
  });

  const result = await sendEmail({
    to: email,
    subject: `Your Clinic Growth sign-in code: ${code}`,
    text: `Your sign-in code is ${code}.\n\nIt expires in ${OTP_TTL_MINUTES} minutes. If you didn't ask for it, you can ignore this email.`,
  });

  if (!result.delivered) {
    // An undelivered code must not stay valid.
    await prisma.otpCode.delete({ where: { id: record.id } });
    throw new OtpDeliveryError(result.error ?? "Email not sent");
  }
}

export async function verifyOtp(rawEmail: string, code: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({
    where: {
      identifier: normalizeEmail(rawEmail),
      codeHash: hashCode(code.trim()),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;

  // updateMany with consumedAt: null makes a code single-use even under concurrent requests.
  const { count } = await prisma.otpCode.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return count === 1;
}
