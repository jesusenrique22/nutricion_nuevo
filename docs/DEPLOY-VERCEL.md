# Deploy en Vercel (Neon + MongoDB Atlas)

## 1. Bases de datos (ya configuradas)

- **PostgreSQL:** Neon — migraciones aplicadas y seed ejecutado.
- **MongoDB:** Atlas — colección `nutricion_chat` (chat se crea al primer uso).

## 2. Subir a Vercel

1. Push del repo a GitHub.
2. [vercel.com](https://vercel.com) → **Add New Project** → importar el repo.
3. Framework: **Next.js** (detectado automático).
4. `vercel.json` ya define build con `pnpm run vercel-build`.

## 3. Variables de entorno en Vercel

Project → **Settings** → **Environment Variables** (Production):

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon (`?sslmode=require`) |
| `MONGODB_URI` | URI de MongoDB Atlas |
| `MONGODB_DB` | `nutricion_chat` |
| `AUTH_SECRET` | Secreto NextAuth (mismo que en `.env` local) |
| `NEXTAUTH_URL` | `https://TU-PROYECTO.vercel.app` (tras el 1er deploy) |
| `CRON_SECRET` | Token para `/api/cron/reminders` |
| `NEXT_PUBLIC_SOCKET_URL` | Opcional — URL del servidor Socket.io |
| `SOCKET_INTERNAL_SECRET` | Opcional — mismo valor en servidor socket |

**Importante:** Tras el primer deploy, actualiza `NEXTAUTH_URL` con la URL real y **redeploy**.

## 4. Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@gmail.com` | `Admin123` |

Pacientes: registro en `/register`.

## 5. Limitaciones en Vercel

| Funcionalidad | Estado |
|---------------|--------|
| Login, citas, formularios, admin | ✅ |
| Chat (mensajes al recargar) | ✅ con MongoDB |
| Chat en tiempo real | ⚠️ Requiere `pnpm run socket` en Railway/Render |
| Archivos del chat | ⚠️ Disco efímero — no persisten entre deploys |
| Emails | ⚠️ Configurar SMTP en variables |

## 6. Comandos locales útiles

```bash
pnpm run db:check        # Verificar Neon
pnpm run db:check:mongo  # Verificar Atlas
pnpm run vercel-build    # Simular build de Vercel
pnpm run db:seed         # Re-ejecutar datos iniciales
```

## 7. CLI (opcional)

```bash
npx vercel login
npx vercel --prod
```
