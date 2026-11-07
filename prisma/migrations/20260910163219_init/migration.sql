-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('prospect', 'demo', 'live', 'suspended', 'churned');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('draft', 'live', 'suspended');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'cancelled');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('contact_form', 'click_to_call', 'whatsapp');

-- CreateEnum
CREATE TYPE "GscVerificationMethod" AS ENUM ('meta', 'dns_txt');

-- CreateEnum
CREATE TYPE "GenerationApi" AS ENUM ('places', 'pagespeed', 'openai');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'admin');

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "category" TEXT,
    "google_place_id" TEXT,
    "hours" JSONB,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "photos" JSONB,
    "status" "ClinicStatus" NOT NULL DEFAULT 'prospect',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_health_checks" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "has_existing_site" BOOLEAN NOT NULL DEFAULT false,
    "existing_site_url" TEXT,
    "mobile_friendly" BOOLEAN,
    "load_speed_score" INTEGER,
    "is_indexed" BOOLEAN,
    "conversion_checks" JSONB,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "sub_scores" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "about_copy" TEXT NOT NULL,
    "services" JSONB NOT NULL,
    "seo_meta" JSONB NOT NULL,
    "json_ld" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prompt_version" TEXT NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "subdomain_slug" TEXT NOT NULL,
    "custom_domain" TEXT,
    "domain_verified" BOOLEAN NOT NULL DEFAULT false,
    "ga_measurement_id" TEXT,
    "gsc_verification_method" "GscVerificationMethod",
    "gsc_verification_value" TEXT,
    "custom_header_scripts" TEXT,
    "custom_body_scripts" TEXT,
    "status" "SiteStatus" NOT NULL DEFAULT 'draft',

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'owner',
    "clinic_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "identifier" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "razorpay_customer_id" TEXT,
    "razorpay_subscription_id" TEXT,
    "plan_tier" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "source" "LeadSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "clinic_id" TEXT,
    "api" "GenerationApi" NOT NULL,
    "cost_estimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinics_slug_key" ON "clinics"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_google_place_id_key" ON "clinics"("google_place_id");

-- CreateIndex
CREATE INDEX "site_health_checks_clinic_id_idx" ON "site_health_checks"("clinic_id");

-- CreateIndex
CREATE INDEX "scores_clinic_id_idx" ON "scores"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_content_clinic_id_key" ON "site_content"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_clinic_id_key" ON "site_settings"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_subdomain_slug_key" ON "site_settings"("subdomain_slug");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_custom_domain_key" ON "site_settings"("custom_domain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "otp_codes_identifier_idx" ON "otp_codes"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_razorpay_subscription_id_key" ON "subscriptions"("razorpay_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_clinic_id_idx" ON "subscriptions"("clinic_id");

-- CreateIndex
CREATE INDEX "leads_clinic_id_idx" ON "leads"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_key_key" ON "prompt_templates"("key");

-- CreateIndex
CREATE INDEX "generation_usage_clinic_id_idx" ON "generation_usage"("clinic_id");

-- CreateIndex
CREATE INDEX "generation_usage_user_id_idx" ON "generation_usage"("user_id");

-- AddForeignKey
ALTER TABLE "site_health_checks" ADD CONSTRAINT "site_health_checks_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_content" ADD CONSTRAINT "site_content_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_usage" ADD CONSTRAINT "generation_usage_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
