# Seguridad — Anttova / Nutrición

Guía de medidas implementadas y requisitos de despliegue.

## Resumen

| Capa | Medida |
|------|--------|
| SQL | Prisma ORM (consultas parametrizadas). Raw SQL solo con `$queryRaw` tagged template. Script CI prohíbe `*RawUnsafe`. |
| NoSQL (MongoDB) | Driver nativo con objetos tipados; IDs validados con Zod antes de `ObjectId`. |
| Auth | NextAuth v5, sesiones server-side, roles `ADMIN` / `PATIENT`. |
| Server Actions | Validación Zod en entradas; guards `requireSession` / `requireAdmin` / `requireSelfOrAdmin`. |
| Rate limiting | Upstash Redis: citas (5/min), auth (10/min por IP). En producción sin Redis → fail-closed. |
| Headers | CSP, HSTS (prod), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy. |
| Secretos | Variables en `.env`; nunca en el repo. |

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
- `createNotification`: servicio interno (`src/server/services/notification.service.ts`), **no** es Server Action exportada.
- Acciones admin: comprobar `session.user.role === "ADMIN"` antes de mutar datos.

Helpers reutilizables: `src/lib/security/auth-guards.ts`.

## Rate limiting

Variables obligatorias en **producción**:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

| Prefijo | Límite | Uso |
|---------|--------|-----|
| `rl:appointment` | 5 / 60 s | Reserva de citas |
| `rl:auth` | 10 / 60 s | Registro, reset, verificación email |

Sin Upstash en producción, las acciones limitadas responden con error (fail-closed).

## Headers HTTP

Definidos en `next.config.ts` (y duplicados en `vercel.json` para rutas estáticas en Vercel).

- **CSP:** restringe orígenes de script, imagen, conexión (Cloudinary, Google reCAPTCHA, Upstash).
- **HSTS:** solo con `NODE_ENV=production`.

## Validación de entradas

Patrón estándar en server actions:

```ts
const parsed = schema.safeParse(formData);
if (!parsed.success) return { ok: false, message: "..." };
```

Contraseñas: mínimo 8, máximo 128 caracteres (límite bcrypt). Hash con bcrypt cost 10.

## Checklist de despliegue

- [ ] `DATABASE_URL`, `AUTH_SECRET`, MongoDB URI configurados
- [ ] Upstash Redis para rate limit
- [ ] HTTPS en el dominio (Vercel lo provee)
- [ ] `CRON_SECRET` para rutas `/api/cron/*`
- [ ] Revisar que `.env` no esté en git
- [ ] Ejecutar `node scripts/check-sql-safety.mjs` en CI

## Próximas mejoras (opcional)

- CSP más estricta con nonces (requiere ajustes en Next.js)
- Validación Zod en más actions de pago/refunds
- Auditoría de logs de acceso admin
- WAF / bot protection en Vercel Edge
