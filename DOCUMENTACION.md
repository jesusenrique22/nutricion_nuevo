# Anttova — Documentación del proyecto

Plataforma web para consultorio de nutrición (Lic. Ma Antonieta Lanza): agendamiento, formularios clínicos, seguimiento, chat, recursos digitales y panel de personalización (CMS).

**Stack:** Next.js 16 · React 19 · TypeScript · PostgreSQL (Prisma) · MongoDB (chat/notificaciones) · NextAuth v5 · Socket.io · Tailwind CSS 4 · Zod

---

## Índice

1. [Estado general del proyecto](#1-estado-general-del-proyecto)
2. [Arquitectura](#2-arquitectura)
3. [Módulos implementados](#3-módulos-implementados)
4. [Panel Personalizar (CMS)](#4-panel-personalizar-cms)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Rutas de la aplicación](#6-rutas-de-la-aplicación)
7. [Variables de entorno](#7-variables-de-entorno)
8. [Comandos útiles](#8-comandos-útiles)
9. [Credenciales de desarrollo](#9-credenciales-de-desarrollo)
10. [Pendiente / próximos pasos](#10-pendiente--próximos-pasos)
11. [Seguridad](#11-seguridad)
12. [Email (SMTP)](#12-email-smtp)
13. [Google Calendar](#13-google-calendar)

---

## 1. Estado general del proyecto

**Progreso global estimado: ~85%** para un MVP funcional en local. Falta sobre todo producción (deploy, email SMTP, pasarela de pago) y algunos pulidos de admin.

| Área | Estado | Notas |
|------|--------|-------|
| Infraestructura | ✅ ~95% | Next.js, Prisma, seed, scripts cron/reminders |
| Auth | ✅ ~95% | Login, registro, recuperación con código por email |
| Landing / marketing | ✅ ~85% | Brand Anttova, imágenes editables desde CMS |
| Formularios clínicos | ✅ ~95% | **100% dinámicos** vía CMS (5 plantillas) |
| Agendamiento | ✅ ~95% | Slots, reservas, reagendar, bloqueos admin, recordatorios email+in-app |
| Panel admin | ✅ ~80% | Pacientes, calendario, analytics, mediciones |
| Chat | ✅ ~85% | UI + Socket.io + MongoDB + badges unread |
| Recursos digitales | ✅ ~85% | CRUD, tienda, librería; pagos manuales |
| CMS / Personalizar | ✅ ~90% | Imágenes, precios, textos, formularios, plan semanal |
| Pagos online | 🔴 ~10% | Modelo `Payment` + registro manual; sin Stripe |
| Deploy / prod | 🟡 ~50% | Vercel + Neon; SMTP y Upstash configurables |

**Leyenda:** ✅ funcional · 🟡 parcial · 🔴 pendiente

---

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App (App Router)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Marketing   │  │    Auth      │  │    Dashboard     │   │
│  │  (público)   │  │ login/reg    │  │ admin / patient  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                          │                    │             │
│                    Server Actions         Server Actions    │
└──────────────────────────┼────────────────────┼─────────────┘
                           ▼                    ▼
              ┌────────────────────┐  ┌───────────────────┐
              │   PostgreSQL       │  │     MongoDB       │
              │   (Prisma)         │  │  chat, notifs     │
              └────────────────────┘  └───────────────────┘
                                              ▲
              ┌────────────────────┐          │
              │  Socket.io server  │──────────┘
              │  pnpm run socket   │
              └────────────────────┘
```

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| Páginas | `src/app/` | UI por rol (marketing, auth, dashboard) |
| Componentes | `src/components/` | Formularios, CMS, calendario, chat, brand |
| Server Actions | `src/server/actions/` | Mutaciones y queries |
| Servicios | `src/server/services/` | Slots, disponibilidad |
| CMS | `src/lib/form-templates-catalog.ts`, `SiteContent` | Plantillas y contenido editable |
| Auth | `src/lib/auth.ts`, `src/lib/auth-edge.ts`, `src/proxy.ts` | NextAuth + protección de rutas (Edge vs servidor) |
| BD relacional | `prisma/schema.prisma` | PostgreSQL |
| BD documental | `src/server/db/mongo.ts` | MongoDB |

**Decisión:** monolito Next.js (no backend separado). Uploads locales en `public/uploads/`.

---

## 3. Módulos implementados

### 3.1 Autenticación

- NextAuth v5 (Credentials, bcrypt).
- Roles: `ADMIN` (nutricionista) · `PATIENT`.
- Registro de pacientes con `PatientProfile` y verificación por email.
- **Recuperar contraseña:** `/forgot-password` — código de 6 dígitos por correo (15 min) → nueva contraseña. Ver [§12 Email](#12-email-smtp).
- Protección de rutas en `src/proxy.ts` (Edge). Ver **[docs/DEPLOY-VERCEL.md](./docs/DEPLOY-VERCEL.md)** (regla Edge).

### 3.2 Marketing

- **Landing** (`/`): hero carrusel, galería, servicios, paquetes — imágenes desde CMS (`landing_images`).
- **Recursos públicos** (`/resources`): catálogo real desde PostgreSQL.
- **Perfil nutricionista** (`/nutricionista`).
- Brand assets en `public/brand/`.

### 3.3 Formularios clínicos (dinámicos)

Todos los formularios de cita usan plantillas editables en **Personalizar → Formularios** y el componente `DynamicConsultationForm`.

| Código plantilla | Cuándo se usa | Pasos |
|------------------|---------------|-------|
| `intake` | Primera cita (`flow = INTAKE`) | 6 |
| `nutrition` | Primera consulta NUT-01 | 4 |
| `training` | Primera consulta ENT-02 | 5 |
| `anthropometry` | Primera consulta ANT-03 | 5 |
| `follow_up` | Citas de seguimiento | 1 |

**Tipos de campo soportados:** texto, párrafo, email, teléfono, fecha, hora, URL, número, select, radio, checkbox, checkbox-group.

- Validación dinámica: `src/lib/dynamic-form-schema.ts`
- Envío unificado: `src/server/actions/form-submission.actions.ts`
- Campos custom → `extendedPayload` (JSON) en cada submission
- Peso en seguimiento → crea `AnthropometryMeasurement`
- URL del formulario **sin ID de cita:** `/dashboard/patient/appointments/form?slot=N`

### 3.4 Agendamiento

- Tipos de consulta con reglas (ANT-03 solo presencial matutino).
- Precios editables desde CMS (seed: $35.000 / $40.000 / $25.000 ARS).
- Crear cita, slots disponibles, rate limit (Upstash opcional).
- **Admin:** confirmar, cancelar, completar, no-show, **reagendar**, **bloquear días sin atención** y bloqueos parciales desde calendario.
- **Paciente:** cancelar y **reagendar** citas propias (mín. 2 h de anticipación).
- **Recordatorios:** notificaciones in-app + **correo al paciente** (si SMTP) + `GET /api/cron/reminders` + `pnpm run reminders`.
- Pagos **manuales** (`payment.actions.ts`); sin Stripe.

### 3.5 Panel admin

- **Calendario** semanal/mensual con panel al clic.
- **Pacientes:** listado + ficha con anamnesis, formularios, seguimientos, mediciones, **plan semanal**.
- **Analytics:** stats por tipo de consulta.
- **Recursos:** CRUD + upload (portada, PDF, video).
- **Registrar mediciones** ISAK + gráficas de evolución.
- **Personalizar:** ver §4.

### 3.6 Panel paciente

- Agendar citas + historial + alertas de formularios pendientes.
- **Progreso:** mediciones y gráficas SVG.
- **Librería:** recursos adquiridos + tienda; **plan semanal** si está publicado.
- **Chat** + **notificaciones** con badges en sidebar.

### 3.7 Chat y notificaciones

- MongoDB: conversaciones, mensajes, notificaciones.
- Socket.io (`pnpm run socket`, puerto 3001).
- Upload adjuntos chat → `public/uploads/chat/`.
- UI en `/dashboard/chat` y `/dashboard/notifications`.

### 3.8 Recursos digitales (Módulo 5)

- Admin CRUD en `/dashboard/admin/resources`.
- Tienda pública y librería del paciente.
- Acceso gratis si `price = 0`; compra manual → admin otorga acceso (`grantResourceAccess` en backend; UI de otorgar pendiente de pulir).

### 3.9 Plan semanal

- Modelo `PatientWeeklyPlan` (días + comidas JSON).
- Admin edita/publica desde ficha del paciente.
- Paciente lo ve en `/dashboard/patient/library`.

---

## 4. Panel Personalizar (CMS)

Ruta: `/dashboard/admin/personalizar`

| Pestaña | Qué edita |
|---------|-----------|
| **Imágenes** | Hero, galería, paquetes, servicios, filosofía, CTA — subida a `public/uploads/site/` |
| **Precios y consultas** | Nombre, descripción, precio, duración (NUT/ENT/ANT) |
| **Contenido web** | Bloques de texto: hero, paquetes, bio |
| **Formularios** | Preguntas de las 5 plantillas (tipos, opciones, pasos) |
| **Recursos** | Acceso al CRUD de recursos |

---

## 5. Modelo de datos

### PostgreSQL (Prisma)

```
User ──┬── PatientProfile ──┬── IntakeForm (1:1)
       │                    └── AnthropometryMeasurement (1:N)
       ├── Appointment ──┬── Payment (1:1)
       │                 ├── FollowUpSubmission (1:1)
       │                 ├── AnthropometryFormSubmission (1:1)
       │                 ├── NutritionFormSubmission (1:1)
       │                 └── TrainingFormSubmission (1:1)
       ├── ResourcePurchase ── Resource
       └── PatientWeeklyPlan (1:N)

ConsultationType ── Appointment (1:N)
SiteContent (slug + JSON) — CMS textos e imágenes landing
FormTemplate (code + fields JSON) — formularios editables
```

### MongoDB

| Colección | Uso |
|-----------|-----|
| `conversations` | Hilos paciente ↔ nutricionista |
| `messages` | Mensajes de chat |
| `notifications` | Alertas in-app |

---

## 6. Rutas de la aplicación

### Públicas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing Anttova (imágenes CMS) |
| `/resources` | Tienda de recursos |
| `/nutricionista` | Perfil / CV |
| `/login` · `/register` | Auth |
| `/forgot-password` | Recuperar contraseña (código por email) |

### Dashboard — común

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Inicio (métricas reales admin/paciente) |
| `/dashboard/chat` | Chat en vivo |
| `/dashboard/notifications` | Notificaciones |

### Dashboard — paciente

| Ruta | Descripción |
|------|-------------|
| `/dashboard/patient/appointments` | Agendar + historial |
| `/dashboard/patient/appointments/form` | Formularios dinámicos |
| `/dashboard/patient/progress` | Mediciones + gráficas |
| `/dashboard/patient/library` | Recursos + plan semanal |

### Dashboard — admin

| Ruta | Descripción |
|------|-------------|
| `/dashboard/admin/calendar` | Calendario + gestión citas |
| `/dashboard/admin/patients` | Listado |
| `/dashboard/admin/patients/[id]` | Ficha + mediciones + plan semanal |
| `/dashboard/admin/analytics` | Estadísticas |
| `/dashboard/admin/resources` | CRUD recursos |
| `/dashboard/admin/personalizar` | CMS |

---

## 7. Variables de entorno

| Variable | Requerida | Uso |
|----------|-----------|-----|
| `DATABASE_URL` | ✅ | PostgreSQL |
| `AUTH_SECRET` | ✅ | NextAuth JWT |
| `AUTH_URL` / `NEXTAUTH_URL` | ✅ prod | URL base (sesión + links en emails) |
| `SMTP_HOST` | ⚠️ prod | Envío de correo — [§12](#12-email-smtp) |
| `SMTP_PORT` | Opcional | Default `587` |
| `SMTP_USER` / `SMTP_PASS` | ⚠️ prod | Usuario y contraseña de aplicación |
| `EMAIL_FROM` | Recomendado | Remitente visible |
| `MONGODB_URI` | ⚠️ | Chat |
| `UPSTASH_*` | ✅ prod | Rate limit auth y citas |
| `GOOGLE_CALENDAR_*` | Opcional | Sync calendario admin — [§13](#13-google-calendar) |
| `SOCKET_PORT` / `NEXT_PUBLIC_SOCKET_URL` | Opcional | Chat en tiempo real |
| `CRON_SECRET` | Opcional | Recordatorios |
| `RECAPTCHA_*` | Recomendado | Anti-spam al agendar |

**Deploy:** variables en **[docs/DEPLOY-VERCEL.md](./docs/DEPLOY-VERCEL.md)**.

---

## 8. Comandos útiles

```bash
# Desarrollo (3 terminales si usás chat + reminders)
pnpm install
pnpm run dev              # http://localhost:3000
pnpm run socket           # Socket.io :3001

# Base de datos
pnpm run db:push          # Sincronizar schema (dev)
pnpm run db:migrate       # Migraciones formales
pnpm run db:seed          # Consultas, admin, CMS, recurso demo
pnpm run db:studio        # Prisma Studio
pnpm run db:check         # Verificar PostgreSQL
pnpm run db:check:mongo   # Verificar MongoDB
pnpm run email:check      # Verificar SMTP (antes de prod)

# Recordatorios (cron manual o externo)
pnpm run reminders

# Producción
pnpm run build
pnpm run start
```

---

## 9. Credenciales de desarrollo

Tras `pnpm run db:seed`:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@gmail.com` | `Admin123` |

Pacientes: registro en `/register`.

**PostgreSQL local (ejemplo):** `NutricionSQL` en `localhost:5432`.

---

## 10. Pendiente / próximos pasos

### Prioridad alta (producción)

| Tarea | Detalle |
|-------|---------|
| Deploy Vercel + dominio | Ver [DEPLOY-VERCEL.md](./docs/DEPLOY-VERCEL.md) |
| Upstash en producción | Obligatorio para rate limit de auth |
| Migraciones formales | `pnpm run db:migrate` en prod |

### Prioridad media (producto)

| Tarea | Detalle |
|-------|---------|
| Pasarela de pago | Stripe u otra; hoy pagos manuales |
| Otorgar recursos desde admin | Action existe; falta UI clara en ficha o recursos |
| Ficha admin completa | Mostrar todos los campos de formularios (incl. `extendedPayload`) |
| Landing textos 100% CMS | Algunos bloques de copy siguen hardcodeados en componentes |
| Sidebar móvil | Menú hamburguesa en pantallas pequeñas |

### Prioridad baja

| Tarea | Detalle |
|-------|---------|
| OAuth / verificación email | Verificación email ✅; OAuth login no implementado |
| Tests + CI/CD | Sin suite configurada |
| Cloud storage | Uploads locales; migrar a S3/Cloudinary si escala |
| i18n | Textos en español hardcodeados |

---

## 11. Seguridad

Medidas activas en el código (detalle en [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md)):

- **SQL:** Prisma parametrizado; script `pnpm run check:sql` prohíbe `*RawUnsafe` en `src/`.
- **Auth / IDOR:** guards en `src/lib/security/auth-guards.ts`; planes semanales solo para el paciente o admin.
- **Notificaciones:** servicio interno (no invocable desde el cliente).
- **Rate limit:** Upstash Redis — citas y endpoints de auth (`UPSTASH_REDIS_REST_*` obligatorio en prod).
- **Headers:** CSP, HSTS (prod), X-Frame-Options, nosniff en `next.config.ts`.

---

## 12. Email (SMTP)

Anttova envía correos solo por **SMTP** (sin Resend/SendGrid): verificación de cuenta y **código de 6 dígitos** para recuperar contraseña.

### Variables

```env
SMTP_HOST="smtp.gmail.com"       # Google Workspace / Gmail
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="tu@correo.com"
SMTP_PASS="contraseña_de_aplicación"   # sin espacios
EMAIL_FROM="Anttova <tu@correo.com>"
```

| Proveedor | `SMTP_HOST` | Notas |
|-----------|-------------|-------|
| Google Workspace / Gmail | `smtp.gmail.com` | Verificación 2 pasos + [contraseña de aplicación](https://myaccount.google.com/apppasswords). `SMTP_USER` debe ser la misma cuenta. |
| Hotmail / Outlook | `smtp-mail.outlook.com` | Contraseña de aplicación de **Microsoft**, no de Google. |
| Buzón del dominio | `mail.tudominio.com` | Credenciales del hosting |
| VPS (Postfix local) | `127.0.0.1` | Puerto `25`; configurar SPF/DKIM en DNS |

### Desarrollo sin SMTP

Si `SMTP_HOST` está vacío: registro sin verificación email; códigos de reset en consola y pantalla (modo dev).

### Comandos

```bash
pnpm run email:check   # Verificar conexión SMTP
pnpm run dev           # Reiniciar tras cambiar .env
```

### Vercel

Copiar las 6 variables SMTP en **Settings → Environment Variables** y redeploy. Ver [DEPLOY-VERCEL.md](./docs/DEPLOY-VERCEL.md).

---

## 13. Google Calendar

Las citas agendadas se sincronizan al **Google Calendar del admin** asignado. Requiere **OAuth Client ID + Secret** (una API key no alcanza).

### Google Cloud Console

1. Habilitar **Google Calendar API**
2. **OAuth consent screen** → External → agregar scope `calendar.events` y **Test users** (Gmail de cada admin)
3. Crear **OAuth Client ID** (Web application)
4. **Redirect URIs** (exactas):

```
http://localhost:3000/api/google/calendar/callback
https://TU-DOMINIO.vercel.app/api/google/calendar/callback
```

### Variables

```env
GOOGLE_CALENDAR_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_CALENDAR_CLIENT_SECRET="GOCSPX-..."
GOOGLE_CALENDAR_TIMEZONE="America/Argentina/Buenos_Aires"
NEXTAUTH_URL="https://TU-DOMINIO.vercel.app"
```

`GOOGLE_CALENDAR_REDIRECT_URI` es opcional (se calcula desde `NEXTAUTH_URL`).

### Uso en la app

1. Admin → **Calendario** → **Conectar mi Google Calendar**
2. El primer admin conectado queda como calendario principal para nuevas citas
3. Citas desde hoy en adelante se sincronizan (zona `GOOGLE_CALENDAR_TIMEZONE`)

### Problemas frecuentes

| Error | Solución |
|-------|----------|
| `redirect_uri_mismatch` | URI en Google Cloud = `{NEXTAUTH_URL}/api/google/calendar/callback` |
| `access_denied` | Email del admin en **Test users** del consent screen |
| `invalid_request` | Completar pantalla de consentimiento (nombre, email soporte, dominios autorizados) |

Archivos: `src/server/services/google-calendar-sync.service.ts`, `src/server/actions/google-calendar.actions.ts`.

---

## Estructura de carpetas relevante

```
src/
├── app/
│   ├── (auth)/              login, register, forgot/reset password
│   ├── (dashboard)/         panel admin y paciente
│   ├── (marketing)/         landing, recursos, nutricionista
│   └── api/                 auth, upload, cron/reminders
├── components/
│   ├── cms/                 personalizar, formularios, imágenes
│   ├── forms/               dynamic-consultation-form, wizard
│   ├── resources/           tienda, admin CRUD
│   ├── weekly-plan/         editor admin + vista paciente
│   └── marketing/           landing brand Anttova
├── lib/
│   ├── form-templates-catalog.ts   plantillas default
│   ├── dynamic-form-schema.ts      validación CMS
│   ├── validators/
│   └── security/            auth guards, rate limit, client IP
├── server/
│   ├── actions/             dominio (auth, cms, chat, forms…)
│   ├── queries/             landing, analytics
│   └── socket/              servidor Socket.io
prisma/
├── schema.prisma
├── seed.ts                  importa plantillas desde src/
└── seed-data.ts               SiteContent para seed
public/
├── brand/                   assets brandbook
└── uploads/                 site, resources, chat, weekly-plans
```

---

*Última actualización: junio 2026 — refleja el estado del repositorio tras CMS, formularios dinámicos, recursos, chat y plan semanal.*
