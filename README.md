# Anttova

Plataforma de nutrición, entrenamiento y antropometría para agendar consultas, completar anamnesis, hacer seguimiento clínico y (en desarrollo) chat en vivo y recursos digitales.

## Inicio rápido

```bash
pnpm install
cp .env.example .env   # configura DATABASE_URL, AUTH_SECRET, etc.
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Para el chat en tiempo real (requiere MongoDB en marcha):

```bash
pnpm run socket   # puerto 3001 — en otra terminal junto a dev
```

Variables: `MONGODB_URI`, `MONGODB_DB`, `NEXT_PUBLIC_SOCKET_URL` (ej. `http://localhost:3001`).

### Recordatorios de citas (sin servicios pagos)

```bash
npm run reminders          # script directo (usa PostgreSQL + MongoDB)
# o cron del sistema cada hora:
# 0 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## Documentación

Consulta **[DOCUMENTACION.md](./DOCUMENTACION.md)** para:

- Arquitectura y stack
- Estado de cada módulo (hecho vs pendiente)
- Modelo de datos y rutas
- Variables de entorno
- Roadmap sugerido

## Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@nutricion.local` | `Admin1234!` |

Pacientes: registro en `/register`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm run dev` | Servidor de desarrollo |
| `pnpm run build` | Build de producción |
| `pnpm run db:migrate` | Migraciones Prisma |
| `pnpm run db:seed` | Datos iniciales |
| `pnpm run db:check` | Verificar PostgreSQL |
| `pnpm run socket` | Servidor Socket.io |
