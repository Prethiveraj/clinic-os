import { Prisma, type NotificationChannel, type NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SendResult } from "@/lib/email";

export type NotifyOutcome = "sent" | "failed" | "already_sent";

/**
 * Claims a (clinic, recipient, type, period) slot in notification_log before
 * sending, so re-running a scheduled job never double-sends. A slot whose
 * earlier attempt failed is retried instead of skipped.
 */
export async function notifyOnce(params: {
  clinicId: string;
  userId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  periodKey: string;
  send: () => Promise<SendResult>;
}): Promise<NotifyOutcome> {
  const key = {
    clinicId: params.clinicId,
    recipient: params.recipient,
    type: params.type,
    periodKey: params.periodKey,
  };

  let row = await prisma.notificationLog.findUnique({ where: { clinicId_recipient_type_periodKey: key } });
  if (row?.delivered) return "already_sent";

  if (!row) {
    try {
      row = await prisma.notificationLog.create({
        data: { ...key, userId: params.userId, channel: params.channel },
      });
    } catch (err) {
      // Another run claimed this slot between our check and insert — let it send.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "already_sent";
      throw err;
    }
  }

  const result = await params.send();
  await prisma.notificationLog.update({
    where: { id: row.id },
    data: { delivered: result.delivered, error: result.error ?? null, channel: params.channel },
  });
  return result.delivered ? "sent" : "failed";
}

/** ISO-8601 week key, e.g. "2026-W45" — one photo reminder per clinic owner per week. */
export function isoWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
