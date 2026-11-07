import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) throw new Error("Set SEED_ADMIN_EMAIL in .env to the email that should become the admin.");

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "admin" },
    create: { email: adminEmail, role: "admin" },
  });

  console.log(`Admin ready: ${adminEmail}. Sign in at /login with that email; the code arrives by email.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
