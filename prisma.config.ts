// prisma.config.ts — Prisma 7
import { defineConfig } from "prisma/config";
import * as fs from "fs";
import * as path from "path";

// Prisma CLI no carga .env.local — lo hacemos manualmente
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});