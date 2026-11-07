-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('pending_approval', 'published', 'rejected');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('blog_draft_ready', 'photo_reminder');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'sms');

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "blog_auto_generate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "photo_reminders_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meta_description" TEXT NOT NULL,
    "target_keyword" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "source_questions" JSONB NOT NULL,
    "keyword_source" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "faq" JSONB NOT NULL,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'pending_approval',
    "prompt_version" TEXT NOT NULL,
    "rejection_note" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_posts_clinic_id_status_idx" ON "blog_posts"("clinic_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_clinic_id_slug_key" ON "blog_posts"("clinic_id", "slug");

-- CreateIndex
CREATE INDEX "notification_log_clinic_id_idx" ON "notification_log"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_log_clinic_id_recipient_type_period_key_key" ON "notification_log"("clinic_id", "recipient", "type", "period_key");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

