# Deploy en Vercel (Neon + MongoDB Atlas)

Guía operativa para producción. Arquitectura y módulos: **[DOCUMENTACION.md](../DOCUMENTACION.md)**.

## 1. Subir a Vercel

1. Push del repo a GitHub.
2. [vercel.com](https://vercel.com) → **Add New Project** → importar el repo.
3. Framework: **Next.js** (detectado automático).
4. `vercel.json` ya define build con `pnpm run vercel-build`.

## 2. Variables de entorno (Production)

Project → **Settings** → **Environment Variables**. Cada variable en su **propia fila** (no pegar bloques `.env` enteros).

### Obligatorias

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon (`?sslmode=require`) |
| `MONGODB_URI` | URI de MongoDB Atlas |
| `MONGODB_DB` | `nutricion_chat` |
| `AUTH_SECRET` | Secreto NextAuth (`openssl rand -base64 32`) |
| `AUTH_URL` | `https://TU-PROYECTO.vercel.app` (sin `/` final) |
| `NEXTAUTH_URL` | Mismo valor que `AUTH_URL` |
| `UPSTASH_REDIS_REST_URL` | Rate limit (auth, citas) — [console.upstash.com](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST de Upstash |

### Email (verificación de cuenta + código de recuperación)

| Variable | Ejemplo |
|----------|---------|
| `SMTP_HOST` | `smtp.gmail.com` (Google Workspace) |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | email emisor |
| `SMTP_PASS` | contraseña de aplicación (sin espacios) |
| `EMAIL_FROM` | `Anttova <tu@correo.com>` |

Probar localmente antes del deploy: `pnpm run email:check`.

### Recomendadas

| Variable | Descripción |
|----------|-------------|
| `CRON_SECRET` | Token para `GET /api/cron/reminders` |
| `NEXT_PUBLIC_RECAPTCHA_SITE` | reCAPTCHA v3 (agendar citas) |
| `RECAPTCHA_SECRET` | Secret de reCAPTCHA |
| `GOOGLE_CALENDAR_CLIENT_ID` | OAuth Calendar (admin) |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | OAuth Calendar |
| `GOOGLE_CALENDAR_TIMEZONE` | `America/Argentina/Buenos_Aires` |

### Opcionales

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SOCKET_URL` | URL del servidor Socket.io (chat en vivo) |
| `SOCKET_INTERNAL_SECRET` | Mismo valor en servidor socket |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Solo si la auto-calculada falla; debe ser `{NEXTAUTH_URL}/api/google/calendar/callback` |

**Tras el primer deploy:** confirmá `AUTH_URL` y `NEXTAUTH_URL` con la URL real (**Deployments → Visit**) y **redeploy**.

## 3. URL correcta del proyecto

Vercel puede asignar varios dominios. Usá siempre el del deploy activo. Si entrás a un dominio viejo verás **404** en `/dashboard` o `/login`.

## 4. Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@gmail.com` | `Admin123` |

Pacientes: registro en `/register`.

## 5. MongoDB Atlas

En **Network Access**, agregá **`0.0.0.0/0`** para que Vercel conecte.

Si ves `MongoServerSelectionError`:

1. Verificá `MONGODB_URI` y `MONGODB_DB` en Vercel
2. Codificá caracteres especiales en la URI (`@` → `%40`)
3. Redeploy

## 6. Solución de problemas

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| 404 en `/dashboard` | Dominio incorrecto | URL del deploy activo |
| 500 en `/login` (Middleware) | Proxy importa Prisma | `pnpm run check:deploy` |
| Login “Credenciales inválidas” | BD sin seed | `pnpm run db:seed` contra Neon |
| Error 500 al login | Falta `AUTH_SECRET` | Agregar en Vercel + redeploy |
| Sesión no persiste | `AUTH_URL` incorrecta | Debe coincidir con el dominio del navegador |
| “Demasiadas solicitudes” en prod | Sin Upstash (antes bloqueaba todo) | Configurar `UPSTASH_*` o usar build con fallback en memoria |
| Emails no llegan | SMTP mal configurado | `pnpm run email:check` local; mismas vars en Vercel |
| Google Calendar `redirect_uri_mismatch` | URI en Google Cloud | `{NEXTAUTH_URL}/api/google/calendar/callback` |

## 7. Limitaciones en Vercel

| Funcionalidad | Estado |
|---------------|--------|
| Login, citas, formularios, admin, emails SMTP | ✅ |
| Chat (mensajes al recargar) | ✅ con MongoDB |
| Chat en tiempo real | ⚠️ Requiere `pnpm run socket` en Railway u otro host |
| Archivos del chat en disco local | ⚠️ No persisten entre deploys (usar GridFS) |

## 8. Antes de cada push

```bash
pnpm run check:deploy
```

1. **Límites Edge** — `src/proxy.ts` solo importa `@/lib/auth-edge` (no Prisma).
2. **Build** — `prisma generate` + migraciones + `next build`.
3. **Smoke** — `/login`, `/register`, `/`.

Si Neon no responde: `SKIP_MIGRATE=1 pnpm run check:deploy`

```bash
pnpm run db:check        # PostgreSQL
pnpm run db:check:mongo  # MongoDB
pnpm run email:check     # SMTP
pnpm run check:edge      # Solo proxy
pnpm run vercel-build    # Simular Vercel
```

### Regla Edge (middleware / proxy)

| Archivo | Puede importar |
|---------|----------------|
| `src/proxy.ts` | `@/lib/auth-edge`, `next/server` |
| `src/lib/auth-edge.ts` | `@/lib/auth.config`, `next-auth` |
| `src/lib/auth.ts` | Prisma, bcrypt (solo servidor Node) |

**Nunca** importar `@/lib/auth` ni `@/server/db/prisma` desde `proxy.ts`.

## 9. CLI (opcional)

```bash
npx vercel login
npx vercel --prod
```
