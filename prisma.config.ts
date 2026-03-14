// prisma.config.ts — Prisma 7
// La conexión a la DB va acá, NO en schema.prisma

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",

  // datasource.url se usa para db:push, db:migrate, prisma studio
  // Usamos UNPOOLED porque las migraciones no pueden ir por PgBouncer
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});