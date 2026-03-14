// src/lib/auth/index.ts
import { getServerSession } from "next-auth";
import { authOptions } from "./auth.config";
import { redirect } from "next/navigation";

export { authOptions };

/** Obtiene la sesión del servidor. Redirige a /login si no hay sesión. */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session;
}

/** Requiere un rol específico. */
export async function requireRole(role: "SUPER_ADMIN" | "ADMIN" | "VIEWER") {
  const session = await requireAuth();
  const userRole = (session.user as { role: string }).role;

  const hierarchy: Record<string, number> = {
    SUPER_ADMIN: 3,
    ADMIN: 2,
    VIEWER: 1,
  };

  if ((hierarchy[userRole] ?? 0) < hierarchy[role]) redirect("/dashboard");
  return session;
}

/** Para uso en API Routes — devuelve null en lugar de redirigir. */
export async function getAuthSession() {
  return getServerSession(authOptions);
}
