/** Rutas públicas visitables sin sesión. */
export const PUBLIC_ROUTES = [
  { path: "/", title: "Anttova" },
  { path: "/login", title: "Iniciar sesión" },
  { path: "/register", title: "Crear cuenta" },
  { path: "/forgot-password", title: "Recuperar" },
  { path: "/productos", title: "Productos" },
  { path: "/resources", title: "Recursos" },
  { path: "/nutricionista", title: "Nutricionista" },
] as const;

/** Secciones del panel paciente (sidebar). */
export const PATIENT_ROUTES = [
  { path: "/dashboard", label: "Inicio" },
  { path: "/dashboard/patient/appointments", label: "Mis citas" },
  { path: "/dashboard/patient/library", label: "Recursos" },
  { path: "/dashboard/patient/reviews", label: "Reseñas" },
  { path: "/dashboard/patient/cart", label: "Carrito" },
  { path: "/dashboard/patient/products", label: "Productos" },
  { path: "/dashboard/patient/progress", label: "Progreso" },
  { path: "/dashboard/notifications", label: "Notificaciones" },
] as const;

/** Smoke admin (opcional, requiere credenciales admin). */
export const ADMIN_ROUTES = [
  { path: "/dashboard/admin/calendar", label: "Calendario" },
  { path: "/dashboard/admin/patients", label: "Pacientes" },
  { path: "/dashboard/admin/payments", label: "Pagos" },
  { path: "/dashboard/admin/cupones", label: "Cupones" },
  { path: "/dashboard/admin/resources", label: "Recursos admin" },
  { path: "/dashboard/notifications", label: "Notificaciones" },
] as const;
