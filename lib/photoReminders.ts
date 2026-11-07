import { prisma } from "@/lib/prisma";
import { appUrl, sendEmail } from "@/lib/email";
import { isoWeekKey, notifyOnce, type NotifyOutcome } from "@/lib/notify";

export function photoReminderEmail(clinicName: string): { subject: string; text: string } {
  return {
    subject: `Weekly reminder: add new photos to ${clinicName}'s Google profile`,
    text: [
      `Hi,`,
      ``,
      `This is your weekly reminder to add a few new photos to ${clinicName}'s Google Business Profile.`,
      `Fresh, real photos help people searching nearby recognise your clinic and see that it's active.`,
      ``,
      `Ideas for this week (3-5 photos is plenty):`,
      `  - The outside of the clinic and your signboard, so patients can find you`,
      `  - Your reception and waiting area`,
      `  - A clean, tidy treatment room`,
      `  - Your team at work (with their permission)`,
      ``,
      `Please don't post photos of patients without their written consent.`,
      ``,
      `How to add them:`,
      `  - On a computer: go to https://business.google.com, open your profile, and choose "Add photo".`,
      `  - On your phone: open Google Maps, search for ${clinicName}, and tap "Add photos".`,
      ``,
      `Don't want these reminders? Turn them off in Settings: ${appUrl("/dashboard/settings")}`,
      ``,
      `— Clinic Growth`,
    ].join("\n"),
  };
}

export type ReminderSummary = { clinics: number; sent: number; failed: number; alreadySent: number; noContact: number };

/** One reminder per owner per ISO week, however many times this runs. */
export async function sendWeeklyPhotoReminders(now = new Date()): Promise<ReminderSummary> {
  const periodKey = isoWeekKey(now);
  const clinics = await prisma.clinic.findMany({
    where: {
      googlePlaceId: { not: null },
      subscriptions: { some: { status: "active" } },
      siteSettings: { is: { photoRemindersEnabled: true } },
    },
    select: { id: true, name: true, users: { select: { id: true, email: true } } },
    take: 500,
  });

  const summary: ReminderSummary = { clinics: clinics.length, sent: 0, failed: 0, alreadySent: 0, noContact: 0 };
  const tally = (o: NotifyOutcome) => {
    if (o === "sent") summary.sent++;
    else if (o === "failed") summary.failed++;
    else summary.alreadySent++;
  };

  for (const clinic of clinics) {
    for (const user of clinic.users) {
      if (user.email) {
        const { subject, text } = photoReminderEmail(clinic.name);
        tally(
          await notifyOnce({
            clinicId: clinic.id,
            userId: user.id,
            type: "photo_reminder",
            channel: "email",
            recipient: user.email,
            periodKey,
            send: () => sendEmail({ to: user.email!, subject, text }),
          })
        );
      } else {
        summary.noContact++;
      }
    }
  }

  return summary;
}
