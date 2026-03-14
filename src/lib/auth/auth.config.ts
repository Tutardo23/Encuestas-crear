// src/lib/auth/auth.config.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword, auditLog, rateLimit, getClientIp } from "@/lib/security";
import { loginSchema } from "@/lib/validations";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
    updateAge: 60 * 60,  // Renovar cada hora
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },

      async authorize(credentials, req) {
        // 1. Validar input con Zod
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // 2. Rate limiting por email (5 intentos / 15 min)
        const ip = (req?.headers?.["x-forwarded-for"] as string) ?? "unknown";
        const rl = await rateLimit(`login:${email}`, 5, 15 * 60);
        if (!rl.success) {
          await auditLog({ action: "LOGIN_RATE_LIMITED", metadata: { email }, ip });
          throw new Error("Demasiados intentos. Intentá en 15 minutos.");
        }

        // 3. Buscar usuario
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.isActive) {
          await auditLog({ action: "LOGIN_FAILED_NOT_FOUND", metadata: { email }, ip });
          return null;
        }

        // 4. Verificar si está bloqueado
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await auditLog({ action: "LOGIN_ACCOUNT_LOCKED", userId: user.id, ip });
          throw new Error("Cuenta bloqueada temporalmente. Intentá más tarde.");
        }

        // 5. Verificar contraseña
        const valid = await verifyPassword(password, user.passwordHash);

        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? "5", 10);
          const lockDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES ?? "15", 10);

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: attempts >= maxAttempts
                ? new Date(Date.now() + lockDuration * 60 * 1000)
                : undefined,
            },
          });

          await auditLog({
            action: "LOGIN_FAILED_WRONG_PASSWORD",
            userId: user.id,
            metadata: { attempts },
            ip,
          });

          return null;
        }

        // 6. Login exitoso — resetear contadores
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: ip.substring(0, 45), // Máx largo de IPv6
          },
        });

        await auditLog({ action: "LOGIN_SUCCESS", userId: user.id, ip });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
