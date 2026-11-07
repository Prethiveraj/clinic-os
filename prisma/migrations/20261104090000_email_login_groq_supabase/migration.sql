-- AI generation moved from OpenAI to Groq: keep usage history, rename the value.
ALTER TYPE "GenerationApi" RENAME VALUE 'openai' TO 'groq';

-- Login is email-only: phone numbers are no longer a sign-in identifier.
DROP INDEX IF EXISTS "users_phone_key";
ALTER TABLE "users" DROP COLUMN "phone";

-- SMS reminders were removed; notifications are email-only.
DELETE FROM "notification_log" WHERE "channel" = 'sms';
ALTER TYPE "NotificationChannel" RENAME TO "NotificationChannel_old";
CREATE TYPE "NotificationChannel" AS ENUM ('email');
ALTER TABLE "notification_log"
  ALTER COLUMN "channel" TYPE "NotificationChannel" USING ("channel"::text::"NotificationChannel");
DROP TYPE "NotificationChannel_old";
