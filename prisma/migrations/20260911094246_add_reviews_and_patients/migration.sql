-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "google_review_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "review_time" TIMESTAMP(3) NOT NULL,
    "suggested_reply" TEXT,
    "reply_generated_at" TIMESTAMP(3),
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "last_visit_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_google_review_id_key" ON "reviews"("google_review_id");

-- CreateIndex
CREATE INDEX "reviews_clinic_id_idx" ON "reviews"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_lead_id_key" ON "patients"("lead_id");

-- CreateIndex
CREATE INDEX "patients_clinic_id_idx" ON "patients"("clinic_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
