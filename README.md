# Torx Survey 🔴

Plataforma de encuestas personalizadas con links únicos por destinatario.

## Stack

- **Next.js 14** (App Router)
- **TypeScript** — tipado estricto en toda la app
- **Prisma** + PostgreSQL — ORM con migraciones
- **NextAuth v4** — autenticación con JWT
- **Zod** — validación de input en API y formularios
- **Resend** — envío de mails transaccionales
- **Upstash Redis** — rate limiting en producción
- **Tailwind CSS** — estilos utility-first

## Seguridad implementada

| Capa | Medida |
|------|--------|
| HTTP | CSP, HSTS, X-Frame-Options, Permissions-Policy |
| Middleware | Protección de rutas, JWT validado en cada request |
| Auth | Bcrypt (12 rounds), bloqueo por intentos fallidos, rate limit en login |
| API | `withAuth()` en cada endpoint privado, rate limiting por usuario |
| Tokens | nanoid de 24 chars (144 bits), expiración configurable |
| Datos | IPs hasheadas, tokens nunca expuestos en listados |
| Audit | Log de todas las acciones críticas |

## Setup

### 1. Variables de entorno

```bash
cp .env.example .env.local
# Completar todos los valores
```

### 2. Base de datos (PostgreSQL)

Opciones recomendadas:
- [Supabase](https://supabase.com) (free tier disponible)
- [Neon](https://neon.tech) (free tier, serverless)
- [Railway](https://railway.app)

```bash
# Crear tablas
npm run db:push

# Crear usuario admin
npm run db:seed
```

### 3. Email (Resend)

1. Crear cuenta en [resend.com](https://resend.com)
2. Verificar tu dominio
3. Copiar API key a `.env.local`

### 4. Rate limiting (Upstash)

1. Crear cuenta en [upstash.com](https://upstash.com)
2. Crear una base de datos Redis
3. Copiar URL y token a `.env.local`

> En desarrollo funciona sin Upstash (rate limiting en memoria).

### 5. Correr en desarrollo

```bash
npm run dev
# → http://localhost:3000
# → Login: admin@torx.com / Torx2026!Admin
```

## Flujo de uso

1. **Crear encuesta** → `/dashboard/surveys/new`
2. **Agregar preguntas** → en el tab "Preguntas"
3. **Agregar destinatarios** → en el tab "Destinatarios" (uno a uno o CSV)
4. **Enviar** → en el tab "Envío" → se genera un mail con link único por persona
5. **El destinatario** → recibe el mail, abre el link, responde sin login
6. **Ver resultados** → tab "Resultados" con gráficos por pregunta

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   NextAuth handler
│   │   ├── surveys/              CRUD de encuestas
│   │   │   └── [id]/
│   │   │       ├── questions/    Preguntas
│   │   │       ├── recipients/   Destinatarios
│   │   │       ├── send/         Despacho de mails
│   │   │       └── analytics/    Resultados agregados
│   │   └── response/             API pública (sin auth)
│   ├── dashboard/                Panel admin
│   │   └── surveys/[id]/         Editor de encuesta
│   ├── login/                    Login page
│   └── r/[token]/                Vista pública del respondente
├── components/
│   ├── admin/                    Componentes del panel
│   └── survey/                   Componentes públicos
└── lib/
    ├── auth/                     NextAuth config
    ├── db/                       Prisma client
    ├── email/                    Resend + templates
    ├── security/                 Hash, rate limit, audit
    ├── validations/              Zod schemas
    └── api.ts                    Helpers de API routes
```

## Deploy

### Vercel (recomendado)

```bash
vercel deploy
```

Variables de entorno en Vercel → Settings → Environment Variables.

### Docker

```bash
docker build -t trox-survey .
docker run -p 3000:3000 --env-file .env.local trox-survey
```

---

Desarrollado por **Torx** ·  🔴
