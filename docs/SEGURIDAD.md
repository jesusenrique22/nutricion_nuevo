# Seguridad — Anttova / Nutrición

Guía de medidas implementadas y requisitos de despliegue.

## Resumen

| Capa | Medida |
|------|--------|
| SQL | Prisma ORM (consultas parametrizadas). Raw SQL solo con `$queryRaw` tagged template. Script CI prohíbe `*RawUnsafe`. |
| Auth | NextAuth v5, sesiones server-side, roles `ADMIN` / `PATIENT`. JWT en cookie HttpOnly. |
| **Edge Proxy** | `src/proxy.ts` — protege `/dashboard/*` en Edge Runtime. Sin sesión → redirect `/login`. |
| Server Actions | Validación Zod en entradas; guards `requireSession` / `requireAdmin` / `requireSelfOrAdmin`. |
| Rate limiting | Upstash Redis (recomendado) o fallback en memoria. Auth, citas, subidas, pagos. |
| Headers HTTP | CSP, HSTS (prod), X-Frame-Options, CORP, COOP, nosniff, Referrer-Policy, Permissions-Policy. |
| **WAF** | Reglas en `vercel.json` → bloqueo de scanners, path traversal y exploits comunes. Sin rate-limit en `/api/auth` (evita bloquear sesiones normales). |
| Secretos | Variables en `.env`; nunca en el repo. |
| **HTTPS/SSL** | HSTS `max-age=63072000; includeSubDomains; preload` + redirect HTTP→HTTPS en `next.config.ts`. |

## Edge Proxy (Next.js 16)

`src/proxy.ts` corre en **Edge Runtime** antes de cualquier Server Component:

- Todas las rutas bajo `/dashboard/*` verifican el JWT de NextAuth sin tocar la base de datos.
- Sin sesión válida → redirect a `/login?from=<ruta>`.
- Usuarios ya logueados en `/login`, `/register`, `/forgot-password` → redirect a `/dashboard`.
- Pacientes que intentan acceder a `/dashboard/admin/*` → redirect a `/dashboard`.

> En Next.js 16 el archivo se llama `proxy.ts` (no `middleware.ts`). No deben coexistir ambos.

## HTTPS / SSL

- **Vercel** termina TLS automáticamente con certificados Let's Encrypt renovados.
- `next.config.ts` añade header `Strict-Transport-Security` en producción (2 años, preload).
- Redirect HTTP → HTTPS vía `redirects()` en `next.config.ts` para el dominio `anttova.com`.
- El header HSTS también se define en `vercel.json` para que aplique a rutas estáticas servidas por el CDN.

## WAF — Firewall Vercel

Reglas definidas en `vercel.json` bajo `"firewall"` (requiere plan Pro/Enterprise de Vercel):

| Regla | Acción | Descripción |
|-------|--------|-------------|
| Block path traversal | deny | Bloquea `../` y variantes |
| Block scanner user-agents | deny | sqlmap, nikto, nessus, masscan, nuclei, etc. |
| Block exploit paths | deny | `.php`, `wp-admin`, `phpmyadmin`, `.git/config`, etc. |

> El rate limiting de la app (Upstash o memoria) cubre auth, citas y subidas de forma precisa. No se usa rate-limit WAF en `/api/auth` porque NextAuth consulta `/api/auth/session` en cada navegación y bloquearía usuarios legítimos.

## Inyección SQL

**Riesgo actual: bajo.** Prisma genera SQL parametrizado. Las pocas consultas raw usan plantillas etiquetadas:

```ts
await prisma.$queryRaw`SELECT ... WHERE id = ${id}`;
```

**Prohibido:** `$queryRawUnsafe`, `$executeRawUnsafe`, concatenar strings en SQL.

Verificación local:

```bash
node scripts/check-sql-safety.mjs
```

## Autorización (IDOR)

- `getPublishedWeeklyPlanForPatient`: solo el paciente dueño o un admin.
- `createNotification`: servicio interno, **no** es Server Action exportada.
- Acciones admin: comprobar `session.user.role === "ADMIN"` antes de mutar datos.

Helpers reutilizables: `src/lib/security/auth-guards.ts`.

## Rate Limiting

**Comportamiento fail-open:** si Upstash no responde, la solicitud se permite (no se bloquea al usuario). Sin Upstash configurado, el límite corre en memoria del proceso.

| Limiter | Límite | Endpoints |
|---------|--------|-----------|
| `appointmentLimiter` | 15 req / 60 s | Reservas y citas (agregar al carrito) |
| `authLimiter` | 20 req / 60 s | Registro, reset de contraseña, verificación |
| `uploadLimiter` | 20 req / 60 s | Subida de imágenes, PDFs, comprobantes |
| `paymentLimiter` | 5 req / 60 s | Confirmaciones de pago (disponible para usar) |

**No afecta:** navegación normal, login con `signIn()`, consultas de sesión (`/api/auth/session`), dashboard, ni lectura de páginas.

Con Upstash Redis el límite es compartido entre todas las instancias. Sin Upstash, el fallback en memoria solo funciona con una instancia (suficiente para Vercel Hobby/Pro con una región).

Variables opcionales (recomendadas):

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Headers HTTP

Definidos en `next.config.ts` y `vercel.json` (duplicados para cobertura en CDN):

| Header | Valor |
|--------|-------|
| `Content-Security-Policy` | Restringe scripts, imágenes, conexiones a orígenes permitidos |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (solo prod) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-site` |

## Validación de entradas

Patrón estándar en server actions:

```ts
const parsed = schema.safeParse(formData);
if (!parsed.success) return { ok: false, message: "..." };
```

Contraseñas: mínimo 8, máximo 128 caracteres (límite bcrypt). Hash con bcrypt cost 10.

## Caché y Rendimiento

- CMS content (`landing-images`, `landing-blocks`, `nav-menu`, `products`) se almacena con `unstable_cache` (TTL 5 min). Al guardar en el panel admin se llama `revalidateTag("cms-site-content")`.
- Rutas prefetchadas en el cliente usan `staleTimes: { dynamic: 30, static: 300 }` — reduce round-trips al servidor en navegación.
- Assets de Next.js (`/_next/static/*`) con `Cache-Control: immutable, max-age=1y`.
- `X-Powered-By` eliminado para no exponer el stack.

## Checklist de despliegue

- [ ] `DATABASE_URL` = Neon pooled (no localhost)
- [ ] `AUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_URL` (misma URL pública)
- [ ] Upstash Redis (recomendado) o aceptar fallback en memoria
- [ ] `CRON_SECRET` para rutas `/api/cron/*`
- [ ] `pnpm run check:env` antes del deploy
- [ ] Revisar que `.env` no esté en git
- [ ] `node scripts/check-sql-safety.mjs` en CI
- [ ] Verificar que el plan Vercel tenga WAF activado (Pro/Enterprise)
- [ ] Agregar dominio a [HSTS preload list](https://hstspreload.org/) una vez verificado en producción

## Próximas mejoras (opcional)

- CSP con nonces (elimina `unsafe-inline` en scripts)
- Auditoría de logs de acceso admin
- Bot protection con Vercel Speed Insights / Turnstile
