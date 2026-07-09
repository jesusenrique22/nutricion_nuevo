# Deploy en producción (Neon)

Guía operativa para publicar el sitio en el dominio del cliente. Arquitectura y módulos: **[DOCUMENTACION.md](../DOCUMENTACION.md)**.

## 1. Subir el proyecto

1. Push del repo a GitHub (o el remoto que use el cliente).
2. Conectá el repositorio en tu proveedor de hosting (Next.js detectado automáticamente).
3. **Build command:** `pnpm run build`
4. **Install command:** `pnpm install`
5. Referencia de headers y crons: `deploy.json` (en build del hosting se aplica automáticamente; no va al repo como archivo del proveedor).

**Build command en el panel del hosting:** `pnpm run build` (si el panel aún dice `pnpm run vercel-build`, también funciona — es un alias interno).

**Imágenes iniciales del sitio:** deben estar en `public/uploads/site/` (versionadas en git). El resto de uploads se generan en runtime.

## 2. Variables de entorno (Production)

Configurá cada variable en su **propia fila** en el panel del hosting (no pegar bloques `.env` enteros).

### Obligatorias

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string **pooled** de Neon (`?sslmode=require`). **No uses** `channel_binding=require` — rompe el driver WebSocket en serverless. |
| `AUTH_SECRET` | Secreto NextAuth (`openssl rand -base64 32`) |
| `AUTH_URL` | `https://TU-DOMINIO-DEL-CLIENTE.com` (sin `/` final) |
| `NEXTAUTH_URL` | Mismo valor que `AUTH_URL` |
| `UPSTASH_REDIS_REST_URL` | Rate limit (auth, citas) — [console.upstash.com](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST de Upstash |
| `MONGODB_URI` | **Obligatorio en Vercel** — imágenes, PDFs, comprobantes (GridFS en Atlas) |
| `MONGODB_DB` | `nutricion_chat` |

> **Notificaciones, usuarios, citas y pagos** están en **Neon** (PostgreSQL). Mongo solo guarda archivos binarios y datos de chat.

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
| `CRON_SECRET` | Token para `GET /api/cron/reminders` y `/api/cron/exchange-rate` |
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

**Tras el primer deploy:** confirmá `AUTH_URL` y `NEXTAUTH_URL` con el dominio real del cliente y **redeploy**.

## 3. Dominio del cliente

Apuntá el DNS del cliente al hosting. `AUTH_URL` y `NEXTAUTH_URL` deben coincidir exactamente con la URL que ve el navegador (incluido `www` si aplica).

## 4. Tareas programadas (crons)

Rutas definidas en `deploy.json`:

| Ruta | Horario (UTC) | Descripción |
|------|---------------|-------------|
| `/api/cron/reminders` | `0 12 * * *` | Recordatorios de citas |
| `/api/cron/exchange-rate` | `0 11 * * *` | Tipo de cambio |

Cada request debe incluir el header `Authorization: Bearer <CRON_SECRET>`.

Alternativa local: `pnpm run reminders`

## 5. Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@gmail.com` | `Admin123!` |

Pacientes: registro en `/register`.

**Si el login falla en producción** (mensaje “Credenciales inválidas” con POST 200 en `/api/auth/callback/credentials`):

1. Confirmá que `DATABASE_URL` en el hosting apunta a la misma base Neon que usás en local.
2. Ejecutá el seed contra esa base (una vez):

```bash
pnpm run db:seed
```

Con `DATABASE_URL` de producción en tu `.env` local, o desde el panel de Neon → SQL / seed manual.

3. Verificá con `pnpm run db:check` que exista el admin y usuarios en la BD.

## 6. Solución de problemas

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| 404 en `/dashboard` | Dominio incorrecto | URL del deploy activo |
| 500 en `/login` (proxy) | Proxy importa Prisma | `pnpm run check:deploy` |
| Login “Credenciales inválidas” | BD sin seed o contraseña incorrecta | `pnpm run db:seed` — admin: `admin@gmail.com` / `Admin123!` |
| Error 500 al login | Falta `AUTH_SECRET` | Agregar en hosting + redeploy |
| Sesión no persiste | `AUTH_URL` incorrecta | Debe coincidir con el dominio del navegador |
| Imágenes rotas | Faltan archivos en `public/uploads/site/` o GridFS | Commitear imágenes iniciales, re-subir en Personalizar, o configurar `MONGODB_URI` |
| Error al subir archivo en prod | Sin `MONGODB_URI` en Vercel | Agregar Atlas URI + `MONGODB_DB` y redeploy |
| “Demasiadas solicitudes” | Sin Upstash | Configurar `UPSTASH_*` |
| Emails no llegan | SMTP mal configurado | `pnpm run email:check` local; mismas vars en hosting |
| Google Calendar `redirect_uri_mismatch` | URI en Google Cloud | `{NEXTAUTH_URL}/api/google/calendar/callback` |

## 7. Antes de cada push

```bash
pnpm run check:deploy
```

1. **Límites Edge** — `src/proxy.ts` solo importa `@/lib/auth-edge` (no Prisma).
2. **Build** — `prisma generate` + migraciones + `next build`.
3. **Smoke** — `/login`, `/register`, `/`.

Si Neon no responde: `SKIP_MIGRATE=1 pnpm run check:deploy`

```bash
pnpm run db:check
pnpm run email:check
pnpm run check:edge
pnpm run build
```

### Regla Edge (proxy)

| Archivo | Puede importar |
|---------|----------------|
| `src/proxy.ts` | `@/lib/auth-edge`, `next/server` |
| `src/lib/auth-edge.ts` | `@/lib/auth.config`, `next-auth` |
| `src/lib/auth.ts` | Prisma, bcrypt (solo servidor Node) |

**Nunca** importar `@/lib/auth` ni `@/server/db/prisma` desde `proxy.ts`.
