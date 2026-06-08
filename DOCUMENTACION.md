# NutriVida — Documentación del proyecto

Plataforma web para consultorio de nutrición: agendamiento de citas, anamnesis, seguimiento de pacientes, chat en vivo y tienda de recursos digitales.

**Stack:** Next.js 16 · React 19 · TypeScript · PostgreSQL (Prisma) · MongoDB (chat) · NextAuth v5 · Socket.io · Tailwind CSS 4 · Zod

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Módulos y estado de implementación](#2-módulos-y-estado-de-implementación)
3. [Lo que está hecho (detalle)](#3-lo-que-está-hecho-detalle)
4. [Lo que falta por implementar](#4-lo-que-falta-por-implementar)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Rutas de la aplicación](#6-rutas-de-la-aplicación)
7. [Variables de entorno](#7-variables-de-entorno)
8. [Comandos útiles](#8-comandos-útiles)
9. [Credenciales de desarrollo](#9-credenciales-de-desarrollo)
10. [Orden sugerido para continuar](#10-orden-sugerido-para-continuar)

---

## 1. Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App (App Router)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Marketing   │  │    Auth      │  │    Dashboard     │  │
│  │  (público)   │  │ login/reg    │  │ admin / patient  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                          │                    │             │
│                    Server Actions         Server Actions      │
│                          │                    │             │
└──────────────────────────┼────────────────────┼─────────────┘
                           ▼                    ▼
              ┌────────────────────┐  ┌───────────────────┐
              │   PostgreSQL       │  │     MongoDB       │
              │   (Prisma)         │  │  chat, archivos,  │
              │   datos core       │  │  notificaciones   │
              └────────────────────┘  └───────────────────┘
                                              ▲
              ┌────────────────────┐          │
              │  Socket.io server  │──────────┘
              │  (proceso aparte)  │
              └────────────────────┘
```

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| Páginas | `src/app/` | UI por rol y zona (marketing, auth, dashboard) |
| Componentes | `src/components/` | Formularios, calendario, booking |
| Server Actions | `src/server/actions/` | Mutaciones y queries desde el servidor |
| Servicios | `src/server/services/` | Reglas de negocio (slots, validación) |
| Auth | `src/lib/auth.ts` + `src/proxy.ts` | NextAuth + protección de rutas |
| Validación | `src/lib/validators/` | Esquemas Zod |
| BD relacional | `prisma/schema.prisma` | PostgreSQL |
| BD documental | `src/server/db/mongo.ts` | MongoDB para chat |

---

## 2. Módulos y estado de implementación

| Módulo | Descripción | Estado | Progreso estimado |
|--------|-------------|--------|-------------------|
| **0 — Infraestructura** | Next.js, Prisma, Tailwind, seed, scripts | ✅ Hecho | ~95% |
| **1 — Catálogo y formularios** | Tipos de consulta, intake, follow-up | ✅ Hecho | ~90% |
| **2 — Agendamiento** | Slots, reservas, rate limit, calendario admin | ✅ Hecho | ~85% |
| **3 — Chat en vivo** | Socket.io + MongoDB | 🟡 Parcial | ~30% |
| **4 — Panel admin** | Pacientes, ficha clínica | ✅ Hecho | ~75% |
| **5 — E-Resources** | Tienda de e-books/videos | 🔴 Pendiente | ~10% |
| **6 — Pagos** | Stripe/similar | 🔴 Pendiente | ~5% |
| **7 — Analítica** | Estadísticas por tipo de consulta | 🔴 Pendiente | ~0% |
| **8 — Notificaciones** | Recordatorios, mensajes | 🔴 Pendiente | ~0% |

**Leyenda:** ✅ funcional · 🟡 backend o esquema listo, UI incompleta · 🔴 solo diseño/esquema

---

## 3. Lo que está hecho (detalle)

### 3.1 Autenticación y autorización

- **NextAuth v5** con proveedor Credentials (email + contraseña bcrypt).
- Sesión JWT con rol (`ADMIN` | `PATIENT`) en token y sesión.
- **Registro de pacientes** (`registerPatient`): crea `User` + `PatientProfile`.
- **Protección de rutas** en `src/proxy.ts`:
  - `/dashboard/*` requiere sesión.
  - `/dashboard/admin/*` solo accesible por `ADMIN`.
  - Redirección automática si ya hay sesión en `/login` o `/register`.
- Seed incluye cuenta admin de prueba (ver [§9](#9-credenciales-de-desarrollo)).

### 3.2 Marketing (sitio público)

- **Landing** (`/`): hero, perfil del nutricionista, tarjetas de paquetes (NUT-01, ENT-02, ANT-03).
- **Layout marketing**: navbar con enlaces a recursos, paquetes e inicio de sesión.
- **Página de recursos** (`/resources`): grid visual con datos **mock** (8 placeholders).
- Animaciones con Framer Motion (`Reveal`).

### 3.3 Módulo 1 — Catálogo de consultas y formularios clínicos

**Base de datos (seed):**

| Código | Nombre | Modalidad | Horario | Precio |
|--------|--------|-----------|---------|--------|
| `NUT_01` | Consulta Nutricional | Online + Presencial | 08:00–18:00 | $50 |
| `ENT_02` | Entrenamiento | Online + Presencial | 08:00–18:00 | $40 |
| `ANT_03` | Antropometría | Solo presencial | 08:00–12:00 (matutino) | $35 |

**Formulario de ingreso (INTAKE):**

- Anamnesis completa: perfil personal, historial médico, alergias, hábitos alimenticios, actividad física, objetivos, suplementos.
- Validación Zod en `src/lib/validators/intake.ts`.
- Al enviar: actualiza `PatientProfile`, crea `IntakeForm`, marca `hasCompletedIntake = true`.
- UI: `IntakeFormClient` + página `/dashboard/patient/appointments/[id]/form`.

**Formulario de seguimiento (FOLLOW_UP):**

- Formulario breve: peso, energía, adherencia, síntomas, notas.
- Vinculado a cita con `flow = FOLLOW_UP`.
- Validación en `src/lib/validators/follow-up.ts`.

**Detección automática de flujo:**

- Primera cita del paciente → `INTAKE`.
- Paciente con intake completado → `FOLLOW_UP`.

### 3.4 Módulo 2 — Agendamiento

**Servicios:**

- `validateAppointmentSlot`: modalidad permitida, ventana matutina (ANT-03), detección de solapamiento.
- `getAvailableSlots`: genera bloques horarios respetando duración, citas ocupadas y horas pasadas.

**Server Action `createAppointment`:**

- Autenticación + rate limit (Upstash Redis, opcional en dev).
- Validación Zod + reglas de negocio.
- Crea cita en estado `PENDING`.

**UI paciente:**

- `BookingForm`: selector de tipo, modalidad, fecha y slots disponibles.
- Historial de citas con badges de estado.
- Alertas de formularios pendientes antes de la cita.

**UI admin:**

- Calendario semanal/mensual/diario con `react-big-calendar`.
- Colores por estado (Pendiente, Confirmada, Completada).

### 3.5 Panel admin — Pacientes

- **Listado** (`/dashboard/admin/patients`): nombre, email, estado de ingreso, número de citas.
- **Ficha detallada** (`/dashboard/admin/patients/[id]`):
  - Datos personales del perfil.
  - Anamnesis completa (JSON renderizado).
  - Seguimientos recientes (últimos 5).
  - Tabla de mediciones antropométricas (solo lectura).

### 3.6 Panel paciente — Progreso

- **Mi progreso** (`/dashboard/patient/progress`): tarjetas con últimas mediciones + tabla histórica.
- Lee de `AnthropometryMeasurement` (requiere datos en BD; aún no hay UI para registrarlos).

### 3.7 Chat (backend parcial)

**Implementado:**

- Tipos TypeScript para conversaciones, mensajes, archivos y notificaciones (`src/types/chat.ts`).
- Conexión MongoDB con singleton en dev (`src/server/db/mongo.ts`).
- Server Actions: `getOrCreateConversation`, `sendMessage`, `getMessages`.
- Servidor Socket.io independiente (`pnpm run socket`): salas por conversación, eventos `message` y `typing`.

**No implementado:** UI de chat, cliente Socket.io en frontend, subida de archivos, indicadores de lectura en UI.

### 3.8 Infraestructura y utilidades

- Migración Prisma inicial (`prisma/migrations/`).
- Script `pnpm run db:check` para verificar PostgreSQL.
- Rate limit con fallback permisivo si no hay Upstash configurado.
- Manejo de errores de BD (`withDb` en registro).
- Layout dashboard con sidebar por rol.

---

## 4. Lo que falta por implementar

### 4.1 Prioridad alta

| Funcionalidad | Detalle | Archivos / notas |
|---------------|---------|------------------|
| **Gestión de citas (admin)** | Confirmar, cancelar, marcar completada/no-show | No existe `updateAppointmentStatus` |
| **Registro de antropometría** | Crear `AnthropometryMeasurement` tras consulta ANT-03 | Modelo y lectura listos; falta action + formulario admin |
| **UI de chat** | Componente de conversación, lista de chats, Socket.io client | `chat/page.tsx` es placeholder |
| **Integración Socket ↔ MongoDB** | Persistir en server action y emitir; o persistir en socket server | Flujo documentado pero no conectado |

### 4.2 Prioridad media

| Funcionalidad | Detalle |
|---------------|---------|
| **Pagos** | Modelo `Payment` existe; falta pasarela (Stripe), webhook, flujo post-pago |
| **Dashboard inicio** | Tarjetas muestran `0` fijo; conectar citas próximas, mensajes, notificaciones |
| **Cancelación por paciente** | No puede cancelar/reagendar citas propias |
| **Confirmación automática o manual** | Citas quedan en `PENDING` sin flujo de confirmación |
| **E-Resources — Admin CRUD** | Crear/editar/publicar recursos en `/dashboard/admin/resources` |
| **E-Resources — Tienda** | Catálogo real en `/resources`, compra, acceso en `/dashboard/patient/library` |
| **Analítica admin** | Gráficos por código NUT/ENT/ANT, ingresos, ocupación |

### 4.3 Prioridad baja / mejoras

| Funcionalidad | Detalle |
|---------------|---------|
| **Notificaciones** | Tipos en MongoDB; sin cron, push ni UI |
| **Subida de archivos** | Cloudinary/S3 tipado en `FileDoc`; sin implementación |
| **OAuth** | Tablas NextAuth listas; solo Credentials activo |
| **Verificación de email** | Campo `emailVerified` sin flujo |
| **Recordatorios de cita** | Email/SMS antes de la consulta |
| **Gráficos de progreso** | Evolución de peso/% grasa en paciente |
| **Tests** | Sin suite de tests unitarios/e2e |
| **CI/CD** | Sin pipeline configurado |
| **i18n** | Textos en español hardcodeados |
| **Responsive móvil del sidebar** | Sidebar oculto en móvil (`hidden md:flex`) sin menú alternativo |

### 4.4 Deuda técnica conocida

- `mongo.ts` lanza error al importar si falta `MONGODB_URI` — puede romper build si chat no se usa aún.
- No hay `middleware.ts`; la protección está en `src/proxy.ts` (convención Next.js 16).
- Landing enlaza a registro para agendar, pero el flujo real de reserva está dentro del dashboard autenticado.
- Página pública de recursos usa datos ficticios, no consulta `Resource` de PostgreSQL.

---

## 5. Modelo de datos

### PostgreSQL (Prisma) — fuente de verdad

```
User ──┬── PatientProfile ──┬── IntakeForm (1:1)
       │                    └── AnthropometryMeasurement (1:N)
       ├── Appointment ──┬── Payment (1:1)
       │                 └── FollowUpSubmission (1:1, solo FOLLOW_UP)
       └── ResourcePurchase ── Resource

ConsultationType ── Appointment (1:N)
```

**Enums clave:** `UserRole`, `ConsultationCode`, `AppointmentStatus`, `AppointmentFlow`, `PaymentStatus`, `ConsultationModality`.

### MongoDB — datos en tiempo real

| Colección | Uso previsto | Estado |
|-----------|--------------|--------|
| `conversations` | Hilos paciente ↔ nutricionista | Actions listas |
| `messages` | Mensajes de chat | Actions listas |
| `files` | Adjuntos (chat, fotos progreso, planes) | Solo tipos |
| `notifications` | Alertas in-app | Solo tipos |

---

## 6. Rutas de la aplicación

### Públicas

| Ruta | Estado | Descripción |
|------|--------|-------------|
| `/` | ✅ | Landing |
| `/resources` | 🟡 | Catálogo mock |
| `/login` | ✅ | Inicio de sesión |
| `/register` | ✅ | Registro paciente |

### Dashboard — común

| Ruta | Estado | Descripción |
|------|--------|-------------|
| `/dashboard` | 🟡 | Inicio (datos estáticos) |
| `/dashboard/chat` | 🔴 | Placeholder |

### Dashboard — paciente

| Ruta | Estado | Descripción |
|------|--------|-------------|
| `/dashboard/patient/appointments` | ✅ | Agendar + historial |
| `/dashboard/patient/appointments/[id]/form` | ✅ | Intake o follow-up |
| `/dashboard/patient/progress` | 🟡 | Lectura de mediciones |
| `/dashboard/patient/library` | 🔴 | Placeholder |

### Dashboard — admin

| Ruta | Estado | Descripción |
|------|--------|-------------|
| `/dashboard/admin/calendar` | ✅ | Calendario de citas |
| `/dashboard/admin/patients` | ✅ | Listado |
| `/dashboard/admin/patients/[id]` | ✅ | Ficha clínica |
| `/dashboard/admin/analytics` | 🔴 | Placeholder |
| `/dashboard/admin/resources` | 🔴 | Placeholder |

---

## 7. Variables de entorno

| Variable | Requerida | Uso |
|----------|-----------|-----|
| `DATABASE_URL` | ✅ | PostgreSQL para Prisma |
| `AUTH_SECRET` | ✅ | NextAuth (JWT) |
| `NEXTAUTH_URL` | ✅ | URL base de la app |
| `MONGODB_URI` | ⚠️ | Chat (obligatoria si se importa mongo) |
| `MONGODB_DB` | Opcional | Nombre de BD Mongo (default: `nutricion_chat`) |
| `UPSTASH_REDIS_REST_URL` | Opcional | Rate limit en producción |
| `UPSTASH_REDIS_REST_TOKEN` | Opcional | Rate limit en producción |
| `SOCKET_PORT` | Opcional | Puerto Socket.io (default: `3001`) |
| `NEXT_PUBLIC_SOCKET_URL` | Pendiente | URL del cliente Socket.io |

---

## 8. Comandos útiles

```bash
# Desarrollo
pnpm install
pnpm run dev              # Next.js en http://localhost:3000
pnpm run socket           # Socket.io en puerto 3001 (aparte)

# Base de datos
pnpm run db:check         # Verificar conexión PostgreSQL
pnpm run db:migrate       # Aplicar migraciones
pnpm run db:seed          # Tipos de consulta + admin
pnpm run db:studio        # Prisma Studio

# Producción
pnpm run build
pnpm run start
```

---

## 9. Credenciales de desarrollo

Tras ejecutar `pnpm run db:seed`:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin (nutricionista) | `admin@nutricion.local` | `Admin1234!` |

Los pacientes se registran en `/register`.

---

## 10. Orden sugerido para continuar

1. **Gestión de citas admin** — confirmar/cancelar/completar desde calendario o ficha.
2. **Registro de antropometría** — formulario admin al completar cita ANT-03.
3. **Chat UI** — conectar actions + Socket.io client; probar flujo paciente ↔ admin.
4. **Dashboard inicio** — métricas reales (próxima cita, formularios pendientes).
5. **Pagos** — Stripe Checkout al agendar; actualizar `Payment` y estado de cita.
6. **E-Resources** — CRUD admin, catálogo público, compra y librería del paciente.
7. **Analítica** — agregaciones por `ConsultationCode` y periodo.
8. **Notificaciones** — recordatorios de cita y mensajes nuevos.

---

## Estructura de carpetas relevante

```
src/
├── app/
│   ├── (auth)/           login, register
│   ├── (dashboard)/      panel admin y paciente
│   ├── (marketing)/      landing, recursos públicos
│   └── api/auth/         NextAuth route handler
├── components/
│   ├── booking/          formulario de reserva
│   ├── calendar/         calendario admin
│   ├── forms/            intake, follow-up, primitivos
│   └── motion/           animaciones
├── lib/                  auth, validators, ratelimit
├── server/
│   ├── actions/          server actions por dominio
│   ├── db/               prisma, mongo
│   ├── services/         scheduling, availability
│   └── socket/           servidor Socket.io
├── types/                chat, next-auth
└── proxy.ts              protección de rutas (auth)
prisma/
├── schema.prisma         modelo relacional
├── seed.ts               datos iniciales
└── migrations/           migración init
```

---

*Última actualización: junio 2026 — refleja el estado del repositorio en la rama `main`.*
