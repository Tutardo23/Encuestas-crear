// src/lib/db/prisma.ts — Prisma 7
//
// IMPORTANTE: Después de cambiar schema.prisma, correr:
//   npm run db:generate
//
// Los imports de @prisma/client y @prisma/adapter-neon se resuelven
// en runtime — TypeScript puede quejarse antes del generate, es normal.

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

function createPrismaClient(): any {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida en .env.local");
  }

  // Importamos via require para evitar errores de TS antes del prisma generate.
  // Una vez que corras `npm run db:generate` los tipos quedan disponibles.
  const { PrismaNeonHttp } = require("@prisma/adapter-neon");
  const { PrismaClient }   = require("@prisma/client");

  const adapter = new PrismaNeonHttp(connectionString, {});

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: any };

export const prisma: any =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}