// prisma/seed.ts — Prisma 7
// Ejecutar: npm run db:seed

/* eslint-disable @typescript-eslint/no-require-imports */

import bcrypt from "bcryptjs";

async function main() {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL no definida en .env.local");
    process.exit(1);
  }

  const { PrismaNeonHttp } = require("@prisma/adapter-neon");
  const { PrismaClient }   = require("@prisma/client");

  const adapter = new PrismaNeonHttp(connectionString, {});
  const prisma  = new PrismaClient({ adapter });

  console.log("🌱 Seeding database...");

  const email    = process.env.SEED_ADMIN_EMAIL    ?? "admin@torx.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Torx2026!Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✅ Usuario ya existe: ${email}`);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name:         "Admin Torx",
      passwordHash,
      role:         "SUPER_ADMIN",
    },
  });

  console.log("✅ Admin creado:");
  console.log(`   Email:      ${email}`);
  console.log(`   Contraseña: ${password}`);
  console.log("   ⚠️  Cambiá la contraseña después del primer login.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});