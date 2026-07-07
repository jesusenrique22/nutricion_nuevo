# Deploy en Render (Neon + MongoDB Atlas)

Misma app que en Vercel; cambian la **URL pública** y dónde cargás las variables. La base PostgreSQL es **Neon** (no la de localhost).

## 1. Web Service en Render

1. [render.com](https://render.com) → **New → Web Service** → conectar el repo de GitHub.
2. **Runtime:** Node
3. **Build Command:** `pnpm install && pnpm run vercel-build`
4. **Start Command:** `pnpm start`
5. **Node version:** 20 o superior (Environment → `NODE_VERSION=20` si hace falta).

Tras el primer deploy, copiá la URL que te asigna Render, por ejemplo:
`https://nutricion-xxxx.onrender.com`

## 2. Variables de entorno

**Environment → Environment Variables.** Una variable por fila (no pegar todo el `.env` en un solo campo).

Reemplazá `https://TU-SERVICIO.onrender.com` por tu URL real **sin barra final**.

### Obligatorias

| Variable | Valor |
|----------|--------|
| `DATABASE_URL` | Connection string de **Neon** (`postgresql://...@...-pooler....neon.tech/neondb?sslmode=require`) |
| `MONGODB_URI` | URI de MongoDB Atlas |
| `MONGODB_DB` | `nutricion_chat` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://TU-SERVICIO.onrender.com` |
| `NEXTAUTH_URL` | Igual que `AUTH_URL` |

### Recomendadas

| Variable | Valor |
|----------|--------|
| `UPSTASH_REDIS_REST_URL` | [console.upstash.com](https://console.upstash.com) — gratis; mejor si escalás a varias instancias |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST de Upstash |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_RECAPTCHA_SITE` | Site key reCAPTCHA v3 |
| `RECAPTCHA_SECRET` | Secret reCAPTCHA |
| `GOOGLE_CALENDAR_CLIENT_ID` | OAuth Google Cloud |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | OAuth Google Cloud |
| `GOOGLE_CALENDAR_TIMEZONE` | `America/Argentina/Buenos_Aires` |

### Email (verificación y recuperación)

| Variable | Ejemplo |
|----------|---------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | tu correo |
| `SMTP_PASS` | contraseña de aplicación |
| `EMAIL_FROM` | `Anttova <tu@correo.com>` |

### Opcionales

| Variable | Descripción |
|----------|-------------|
| `GOOGLE_CALENDAR_REDIRECT_URI` | `https://TU-SERVICIO.onrender.com/api/google/calendar/callback` (si la auto-calculada falla) |
| `NEXT_PUBLIC_SOCKET_URL` | Chat en vivo (servidor aparte) |

**Sin Upstash:** la app usa rate limit **en memoria** (una instancia en Render). No bloquea todo el sitio; conviene Upstash si hay varias réplicas.

## 3. Neon (PostgreSQL)

1. [console.neon.tech](https://console.neon.tech) → proyecto → **Connection string** → **Pooled**.
2. Pegá en `DATABASE_URL` en Render.
3. El build (`vercel-build`) ejecuta `prisma migrate deploy` contra Neon.

No uses la URL de `localhost:5432` en Render.

## 4. Servicios externos (actualizar dominio)

| Servicio | Qué poner |
|----------|-----------|
| **Google OAuth** | Redirect: `https://TU-SERVICIO.onrender.com/api/google/calendar/callback` |
| **reCAPTCHA** | Dominio: `tu-servicio.onrender.com` |
| **MongoDB Atlas** | Network Access: `0.0.0.0/0` |

## 5. Crons (recordatorios, cotización)

Render no usa `vercel.json`. Programá llamadas HTTP externas (ej. [cron-job.org](https://cron-job.org)):

```http
GET https://TU-SERVICIO.onrender.com/api/cron/reminders
Authorization: Bearer TU_CRON_SECRET
```

```http
GET https://TU-SERVICIO.onrender.com/api/cron/exchange-rate
Authorization: Bearer TU_CRON_SECRET
```

## 6. “Demasiadas solicitudes”

Si veías ese mensaje **sin tráfico real**, suele ser rate limit sin Upstash: el código antiguo **bloqueaba todo** en producción. Ahora hay fallback en memoria; igual podés agregar Upstash gratis.

## 7. Checklist post-deploy

- [ ] Login admin y paciente
- [ ] Agendar una cita de prueba
- [ ] `pnpm run email:check` local con las mismas vars SMTP
- [ ] Google Calendar → Conectar (admin)
