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

---

## 1. Estado general del proyecto

**Progreso global estimado: ~85%** para un MVP funcional en local. Falta sobre todo producción (deploy, email SMTP, pasarela de pago) y algunos pulidos de admin.

| Área | Estado | Notas |
|------|--------|-------|
| Infraestructura | ✅ ~95% | Next.js, Prisma, seed, scripts cron/reminders |
| Auth | ✅ ~90% | Login, registro, recuperar contraseña (dev: link en pantalla) |
| Landing / marketing | ✅ ~85% | Brand Anttova, imágenes editables desde CMS |
| Formularios clínicos | ✅ ~95% | **100% dinámicos** vía CMS (5 plantillas) |
| Agendamiento | ✅ ~90% | Slots, reservas, confirmar/cancelar/completar, recordatorios |
| Panel admin | ✅ ~80% | Pacientes, calendario, analytics, mediciones |
| Chat | ✅ ~85% | UI + Socket.io + MongoDB + badges unread |
| Recursos digitales | ✅ ~85% | CRUD, tienda, librería; pagos manuales |
| CMS / Personalizar | ✅ ~90% | Imágenes, precios, textos, formularios, plan semanal |
| Pagos online | 🔴 ~10% | Modelo `Payment` + registro manual; sin Stripe |
| Deploy / prod | 🔴 0% | Pendiente VPS, dominio, SMTP |

**Leyenda:** ✅ funcional · 🟡 parcial · 🔴 pendiente

---

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App (App Router)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Marketing   │  │    Auth      │  │    Dashboard     │  │
│  │  (público)   │  │ login/reg    │  │ admin / patient  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
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
| Auth | `src/lib/auth.ts` + `src/proxy.ts` | NextAuth + protección de rutas |
| BD relacional | `prisma/schema.prisma` | PostgreSQL |
| BD documental | `src/server/db/mongo.ts` | MongoDB |

**Decisión:** monolito Next.js (no backend separado). Uploads locales en `public/uploads/`.

---

## 3. Módulos implementados

### 3.1 Autenticación

- NextAuth v5 (Credentials, bcrypt).
- Roles: `ADMIN` (nutricionista) · `PATIENT`.
- Registro de pacientes con `PatientProfile`.
- **Recuperar contraseña:** `/forgot-password`, `/reset-password` (en dev el enlace aparece en pantalla/consola; falta SMTP en producción).
- Protección de rutas en `src/proxy.ts`.

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
- **Admin:** confirmar, cancelar, completar, no-show desde calendario.
- **Paciente:** cancelar citas propias.
- **Recordatorios:** notificaciones in-app + `GET /api/cron/reminders` + `pnpm run reminders`.
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
| `/forgot-password` · `/reset-password` | Recuperar contraseña |

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
| `NEXTAUTH_URL` | ✅ | URL base (links en emails) |
| `SMTP_HOST` | ⚠️ prod | Envío de correo propio (ver `docs/EMAIL.md`) |
| `SMTP_PORT` | Opcional | Default 587 (25 si host local) |
| `SMTP_USER` / `SMTP_PASS` | Opcional | Vacío si usás Postfix local |
| `EMAIL_FROM` | Recomendado | Remitente, ej. `Anttova <consultas@tudominio.com>` |
| `MONGODB_URI` | ⚠️ | Chat |
| `UPSTASH_*` | Opcional | Rate limit |
| `SOCKET_PORT` / `NEXT_PUBLIC_SOCKET_URL` | Opcional | Chat en tiempo real |
| `CRON_SECRET` | Opcional | Recordatorios |

**Email:** solo SMTP (VPS Postfix, buzón del dominio o Gmail gratuito). Sin Resend/SendGrid. Guía completa: [`docs/EMAIL.md`](docs/EMAIL.md).

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
| Deploy VPS + dominio | HTTPS, variables de entorno, procesos PM2/systemd |
| Email SMTP propio | Postfix en VPS o buzón `@tudominio` — ver `docs/EMAIL.md` |
| Migraciones formales | Usar `db:migrate` en prod (hoy mucho `db push` en dev) |

### Prioridad media (producto)

| Tarea | Detalle |
|-------|---------|
| Pasarela de pago | Stripe u otra; hoy pagos manuales |
| Otorgar recursos desde admin | Action existe; falta UI clara en ficha o recursos |
| Reagendar citas | Cambiar fecha/hora sin cancelar |
| Ficha admin completa | Mostrar todos los campos de formularios (incl. `extendedPayload`) |
| Landing textos 100% CMS | Algunos bloques de copy siguen hardcodeados en componentes |
| Sidebar móvil | Menú hamburguesa en pantallas pequeñas |

### Prioridad baja

| Tarea | Detalle |
|-------|---------|
| OAuth / verificación email | Tablas NextAuth listas |
| Tests + CI/CD | Sin suite configurada |
| Cloud storage | Uploads locales; migrar a S3/Cloudinary si escala |
| i18n | Textos en español hardcodeados |

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
│   └── validators/
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
