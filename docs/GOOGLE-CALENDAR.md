# Google Calendar — sincronización con Anttova

Las citas agendadas en Anttova se crean en el **Google Calendar del admin asignado**.

## Importante: API key ≠ OAuth

Una **API key** (`AIza...`) **no alcanza** para escribir en el calendario privado de una persona.

Necesitás **OAuth Client ID + Client Secret** (credenciales de aplicación web).

Si compartiste una API key en chat, **rotala** en Google Cloud Console.

---

## 1. Google Cloud Console — pantalla OAuth (como en tu captura)

### Tipo de aplicación
**Aplicación web**

### Nombre
`Anttova Nutricion` (o el que prefieras)

### Orígenes autorizados de JavaScript
Opcional para este flujo (el redirect va por servidor). Podés agregar igual:

```
http://localhost:3000
https://nutricion-phi.vercel.app
```

### URIs de redireccionamiento autorizados (obligatorio)

```
http://localhost:3000/api/google/calendar/callback
https://nutricion-phi.vercel.app/api/google/calendar/callback
```

Reemplazá `nutricion-phi.vercel.app` por tu dominio si cambia.

### Antes de crear el cliente OAuth

1. **APIs & Services → Library** → habilitar **Google Calendar API**
2. **OAuth consent screen** → External → nombre **Anttova**
3. Scope: `https://www.googleapis.com/auth/calendar.events`
4. **Test users**: Gmail de cada admin que vaya a conectar (modo Testing)

Copiá **Client ID** y **Client Secret** al crear el cliente.

---

## 2. Variables de entorno

`.env.local` y Vercel:

```env
GOOGLE_CALENDAR_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_CALENDAR_CLIENT_SECRET="GOCSPX-..."
GOOGLE_CALENDAR_REDIRECT_URI="http://localhost:3000/api/google/calendar/callback"
GOOGLE_CALENDAR_TIMEZONE="America/Argentina/Buenos_Aires"
NEXTAUTH_URL="http://localhost:3000"
```

En producción, `GOOGLE_CALENDAR_REDIRECT_URI` y `NEXTAUTH_URL` deben usar la URL de Vercel.

---

## 3. Migración de base de datos

```bash
pnpm prisma migrate deploy
# o en dev:
pnpm prisma db push
```

---

## 4. Cómo funciona con varios admins

| Concepto | Descripción |
|----------|-------------|
| **Conexión OAuth** | Cada admin conecta **su** Gmail desde Calendario admin |
| **Admin principal** | Un solo admin marcado como receptor de **nuevas** citas (`isDefaultCalendarAdmin`) |
| **Por cita** | Cada cita guarda `calendarAdminId` — el admin cuyo calendario tiene el evento |

### Flujo

1. Admin A entra a **Calendario** → **Conectar mi Google Calendar**
2. Si es el primero, queda como calendario principal automáticamente
3. Admin B puede conectar el suyo y pulsar **Usar para nuevas citas** para cambiar el principal
4. Paciente agenda → la cita se asigna al admin principal y el evento va a **su** Google Calendar

Las citas **anteriores** a conectar Google no se importan solas.

---

## 5. Qué se sincroniza

| Evento en Anttova | Google Calendar |
|-------------------|-----------------|
| Paciente agenda cita | Evento en calendario del `calendarAdminId` |
| Cita desde carrito | Igual |
| Admin confirma / cambia estado | Se actualiza el evento |
| Cancelación | Se elimina el evento |

---

## 6. Solución de problemas

| Problema | Causa |
|----------|--------|
| `redirect_uri_mismatch` | URI distinta entre Google y `.env` |
| `access_denied` | Email no está en Test users |
| No aparecen eventos | Admin principal sin calendario conectado |
| Otra doctora recibe citas | Revisar quién tiene “Calendario principal” en Calendario admin |

---

## 7. Archivos relevantes

- `src/lib/calendar-admin-resolve.ts` — elige admin para nuevas citas
- `src/server/services/google-calendar.service.ts` — OAuth por `userId`
- `src/server/services/google-calendar-sync.service.ts` — sync por cita
- `src/server/actions/google-calendar.actions.ts` — marcar admin principal
