// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Rutas de admin requieren estar autenticado
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/surveys") || pathname.startsWith("/analytics")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // La ruta de encuesta pública /r/[token] es libre — no requiere auth
    // pero sí pasa por validación de token en la API

    const response = NextResponse.next();

    // Agregar headers de seguridad adicionales
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Rutas públicas: siempre authorized (el middleware decide qué hacer)
        if (
          pathname.startsWith("/r/") ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/response")
        ) {
          return true;
        }
        // Resto requiere token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto assets estáticos
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
