// src/middleware.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Rutas que NO requieren autenticación
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/response",
  "/r/",
  "/_next",
  "/favicon.ico",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dejar pasar rutas públicas sin tocarlas
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Verificar token JWT de NextAuth
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Sin token → redirigir a login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    // Guardar la URL original para redirigir después del login
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Con token → agregar headers de seguridad y continuar
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  matcher: [
    // Excluir archivos estáticos explícitamente
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};