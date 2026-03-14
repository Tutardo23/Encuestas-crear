// src/lib/security/index.ts
// Utilidades de seguridad centralizadas

import { createHash } from "crypto";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

// ===========================
// HASHING
// ===========================

/**
 * Hashea un IP para almacenarlo sin guardar datos personales.
 * Usamos un salt fijo del entorno para que sea consistente.
 */
export function hashIp(ip: string): string {
  const salt = process.env.NEXTAUTH_SECRET ?? "fallback-salt";
  return createHash("sha256")
    .update(ip + salt)
    .digest("hex")
    .substring(0, 16); // Solo los primeros 16 chars
}

/**
 * Hashea una contraseña antes de almacenarla.
 * Wraps bcryptjs para centralizar la lógica.
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12); // 12 rounds = buen balance seguridad/performance
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

// ===========================
// GENERACIÓN DE TOKENS
// ===========================

/**
 * Genera un token único para el link de encuesta.
 * nanoid genera tokens URL-safe criptográficamente seguros.
 */
export function generateSurveyToken(): string {
  return nanoid(24); // 24 chars = 144 bits de entropía
}

/**
 * Genera una fecha de expiración para los tokens.
 */
export function generateTokenExpiry(hoursFromNow?: number): Date {
  const hours =
    hoursFromNow ??
    parseInt(process.env.SURVEY_LINK_EXPIRY_HOURS ?? "168", 10); // 7 días default
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

// ===========================
// RATE LIMITING (sin Upstash para desarrollo local)
// ===========================

// En memoria para dev, reemplazar con Upstash en producción
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  // En producción con Upstash Redis
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_URL !== "https://xxxxx.upstash.io"
  ) {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const ratelimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    });

    const result = await ratelimiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      resetAt: new Date(result.reset),
    };
  }

  // Fallback en memoria para desarrollo
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: new Date(now + windowMs) };
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  return {
    success: entry.count <= limit,
    remaining,
    resetAt: new Date(entry.resetAt),
  };
}

// ===========================
// HEADERS DE SEGURIDAD PARA API ROUTES
// ===========================

export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

// ===========================
// OBTENER IP REAL
// ===========================

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ===========================
// AUDIT LOGGING
// ===========================

export async function auditLog(params: {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ?? {},
        ipHash: params.ip ? hashIp(params.ip) : undefined,
      },
    });
  } catch (error) {
    // El audit log nunca debe romper el flujo principal
    console.error("[AuditLog Error]", error);
  }
}
