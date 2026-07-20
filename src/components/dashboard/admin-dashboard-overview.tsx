import Link from "next/link";
import { BrandQuickLinks } from "@/components/brand/brand-dashboard-shell";
import type { AdminDashboardOverview } from "@/server/actions/dashboard.queries";

const ADMIN_QUICK_LINKS = [
  {
    index: "01",
    href: "/dashboard/admin/calendar",
    title: "Calendario",
    desc: "Agenda del día y bloqueos de horario",
  },
  {
    index: "02",
    href: "/dashboard/admin/patients",
    title: "Pacientes",
    desc: "Fichas, formularios y seguimiento",
  },
  {
    index: "03",
    href: "/dashboard/admin/payments",
    title: "Pagos",
    desc: "Comprobantes y pedidos por confirmar",
  },
  {
    index: "04",
    href: "/dashboard/admin/personalizar",
    title: "Personalizar",
    desc: "Contenido del sitio y productos",
  },
];

function fmtRelative(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  return date.toLocaleDateString("es", { day: "numeric", month: "short" });
}

function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-foreground/10 bg-white px-4 py-3 transition hover:border-primary/20 hover:shadow-sm"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-primary">
        {value}
      </p>
    </Link>
  );
}

export function AdminDashboardOverviewPanel({
  overview,
}: {
  overview: AdminDashboardOverview;
}) {
  const { stats, upcomingAppointments, recentNotifications } = overview;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Citas esta semana"
          value={stats.weekAppointments}
          href="/dashboard/admin/calendar"
        />
        <StatTile
          label="Pedidos por confirmar"
          value={stats.pendingPurchases}
          href="/dashboard/admin/payments"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-foreground/10 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/50">
              Próximas citas
            </h2>
            <Link
              href="/dashboard/admin/calendar"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver calendario
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <p className="mt-4 text-sm text-foreground/50">
              No hay citas programadas en los próximos 14 días.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcomingAppointments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-foreground/8 bg-muted/20 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {a.patientName}
                    </p>
                    <p className="truncate text-xs text-foreground/55">
                      {a.consultationName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-primary">
                      {a.dateLabel}
                    </p>
                    <p className="text-xs text-foreground/50">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-foreground/10 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/50">
              Actividad reciente
            </h2>
            <Link
              href="/dashboard/notifications"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {recentNotifications.length === 0 ? (
            <p className="mt-4 text-sm text-foreground/50">
              Sin notificaciones recientes.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentNotifications.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-xl border px-3 py-2.5 ${
                    n.isRead
                      ? "border-foreground/8 bg-white"
                      : "border-primary/15 bg-primary/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-foreground/40">
                      {fmtRelative(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-foreground/60">
                    {n.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <BrandQuickLinks items={ADMIN_QUICK_LINKS} />
    </div>
  );
}
