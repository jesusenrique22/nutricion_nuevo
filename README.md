# NutriVida

Plataforma de nutrición para agendar consultas, completar anamnesis, hacer seguimiento clínico y (en desarrollo) chat en vivo y recursos digitales.

## Inicio rápido

```bash
pnpm install
cp .env.example .env   # configura DATABASE_URL, AUTH_SECRET, etc.
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Para el chat en tiempo real (opcional, módulo en progreso):

```bash
pnpm run socket   # puerto 3001
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
