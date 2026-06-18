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
| `AUTH_URL` | `https://TU-PROYECTO.vercel.app` (URL exacta, sin `/` final) |
| `NEXTAUTH_URL` | Mismo valor que `AUTH_URL` (compatibilidad emails) |
| `CRON_SECRET` | Token para `/api/cron/reminders` |
| `NEXT_PUBLIC_SOCKET_URL` | Opcional — URL del servidor Socket.io |
| `SOCKET_INTERNAL_SECRET` | Opcional — mismo valor en servidor socket |

**Importante:** Tras el primer deploy, actualiza `AUTH_URL` y `NEXTAUTH_URL` con la URL **real** del proyecto (ej. `https://nutricion-phi.vercel.app`) y **redeploy**.

### URL correcta del proyecto

Vercel puede asignar varios dominios (`nutricion.vercel.app`, `nutricion-phi.vercel.app`, etc.). Usá siempre el dominio del deploy activo que aparece en **Deployments → Visit**. Si entrás a un dominio viejo o de otro proyecto, verás **404** en `/dashboard` o `/login`.

## 4. Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@gmail.com` | `Admin123` |

Pacientes: registro en `/register`.

## 5. MongoDB Atlas — si chat/notificaciones fallan

En **Atlas → Network Access**, agrega **`0.0.0.0/0`** (Allow access from anywhere) para que Vercel pueda conectar.

Si ves `MongoServerSelectionError` o `SSL routines` en los logs:

1. Atlas → **Network Access** → `0.0.0.0/0`
2. Verificá que `MONGODB_URI` y `MONGODB_DB` estén en Vercel (Production)
3. Si la contraseña del usuario Atlas tiene caracteres especiales, codificala en la URI (`@` → `%40`, etc.)
4. Redeploy tras cambiar variables

El código usa `autoSelectFamily: false` y `family: 4` para Vercel.

## 5b. Login no funciona / 404 en `/dashboard`

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| 404 en `/dashboard` o `/login` | Dominio incorrecto | Usá la URL del deploy activo en Vercel |
| **500 en `/login` (Middleware)** | Proxy importa Prisma/`auth.ts` | Usá `@/lib/auth-edge` en `proxy.ts`; corré `pnpm run check:deploy` |
| **500 en `/dashboard/admin/payments`** | Migraciones pendientes en Neon | Redeploy en Vercel; o `pnpm exec prisma migrate deploy` contra `DATABASE_URL` de prod |
| Login con “Credenciales inválidas” | `DATABASE_URL` o seed | Verificá Neon y ejecutá seed en prod si hace falta |
| Error 500 al iniciar sesión | Falta `AUTH_SECRET` | Agregá `AUTH_SECRET` en Vercel y redeploy |
| Sesión no persiste | `AUTH_URL` incorrecta | Debe coincidir con el dominio que usás en el navegador |

## 6. Limitaciones en Vercel

| Funcionalidad | Estado |
|---------------|--------|
| Login, citas, formularios, admin | ✅ |
| Chat (mensajes al recargar) | ✅ con MongoDB |
| Chat en tiempo real | ⚠️ Requiere `pnpm run socket` en Railway/Render |
| Archivos del chat | ⚠️ Disco efímero — no persisten entre deploys |
| Emails | ⚠️ Configurar SMTP en variables |

## 7. Comandos locales útiles

**Antes de cada push a producción**, ejecutá el mismo flujo que Vercel:

```bash
pnpm run check:deploy
```

Eso hace tres cosas:

1. **Límites Edge** — el proxy (`src/proxy.ts`) no puede importar Prisma ni `@/lib/auth` (solo `@/lib/auth-edge`). Evita **500 en `/login`** en Vercel cuando en local con `next dev` parece OK.
2. **Build de producción** — `prisma generate` + migraciones + `next build` (igual que Vercel).
3. **Smoke test** — levanta `next start` y prueba `/login`, `/register` y `/` (detecta fallos de middleware).

Si Neon no responde y solo querés compilar:

```bash
SKIP_MIGRATE=1 pnpm run check:deploy
```

Comandos sueltos:

```bash
pnpm run db:check        # Verificar Neon
pnpm run db:check:mongo  # Verificar Atlas
pnpm run check:edge      # Solo proxy/middleware (rápido)
pnpm run check:smoke     # Requiere .next ya compilado
pnpm run vercel-build    # Simular build de Vercel
pnpm run db:seed         # Re-ejecutar datos iniciales
```

### Regla Edge (middleware / proxy)

| Archivo | Puede importar |
|---------|----------------|
| `src/proxy.ts` | `@/lib/auth-edge`, `next/server` |
| `src/lib/auth-edge.ts` | `@/lib/auth.config`, `next-auth` |
| `src/lib/auth.config.ts` | `next-auth`, tipos de `@prisma/client` |
| `src/lib/auth.ts` | Prisma, bcrypt, providers (solo servidor) |

**Nunca** importar `@/lib/auth` ni `@/server/db/prisma` desde `proxy.ts`.

## 8. CLI (opcional)

```bash
npx vercel login
npx vercel --prod
```
