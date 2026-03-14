// src/lib/api.ts — Zod v4 compatible
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { rateLimit, getClientIp, withSecurityHeaders } from "@/lib/security";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return withSecurityHeaders(NextResponse.json({ ok: true, data }, { status }));
}
export function created<T>(data: T) { return ok(data, 201); }
export function err(message: string, status = 400, details?: unknown) {
  return withSecurityHeaders(NextResponse.json({ ok: false, error: message, details }, { status }));
}
export function unauthorized()              { return err("No autorizado", 401); }
export function forbidden()                 { return err("Sin permisos", 403); }
export function notFound(entity = "Recurso") { return err(`${entity} no encontrado`, 404); }
export function tooManyRequests()           { return err("Demasiadas solicitudes.", 429); }

export function validationError(error: ZodError) {
  // Zod v4 usa .issues (v3 usaba .errors — ambos son arrays)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issues: any[] = (error as any).issues ?? (error as any).errors ?? [];
  const details = issues.map((e) => ({
    field:   Array.isArray(e.path) ? e.path.join(".") : String(e.path ?? ""),
    message: e.message,
  }));
  return err("Datos inválidos", 422, details);
}

export function serverError(context?: string) {
  if (context) console.error(`[API Error] ${context}`);
  return err("Error interno del servidor", 500);
}

type AuthContext = {
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>;
  ip: string;
};
type AuthHandler = (req: NextRequest, ctx: AuthContext, params?: Record<string, string>) => Promise<NextResponse>;

export function withAuth(
  handler: AuthHandler,
  options: { rateLimit?: { limit: number; windowSeconds: number } } = {}
) {
  return async (req: NextRequest, { params }: { params?: Record<string, string> } = {}) => {
    try {
      const session = await getAuthSession();
      if (!session?.user) return unauthorized();

      const ip  = getClientIp(req);
      const rl  = await rateLimit(
        `api:${(session.user as { id: string }).id}:${req.nextUrl.pathname}`,
        options.rateLimit?.limit ?? 60,
        options.rateLimit?.windowSeconds ?? 60
      );
      if (!rl.success) return tooManyRequests();
      return await handler(req, { session, ip }, params);
    } catch (error) {
      if (error instanceof ZodError) return validationError(error);
      console.error("[API Error]", error);
      return serverError();
    }
  };
}

export function withPublicRateLimit(
  handler: (req: NextRequest, ip: string, params?: Record<string, string>) => Promise<NextResponse>,
  options: { limit?: number; windowSeconds?: number } = {}
) {
  return async (req: NextRequest, { params }: { params?: Record<string, string> } = {}) => {
    try {
      const ip = getClientIp(req);
      const rl = await rateLimit(`public:${ip}:${req.nextUrl.pathname}`, options.limit ?? 20, options.windowSeconds ?? 60);
      if (!rl.success) return tooManyRequests();
      return await handler(req, ip, params);
    } catch (error) {
      if (error instanceof ZodError) return validationError(error as ZodError);
      console.error("[API Error]", error);
      return serverError();
    }
  };
}