import { getAnalyticsSummary } from "@/server/actions/analytics.queries";
import { appointmentStatusLabels } from "@/lib/appointment-labels";

export const dynamic = "force-dynamic";

function Bar({
  label,
  value,
  max,
  color = "bg-primary",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-foreground/50">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsSummary();

  if (!data) {
    return <p>No autorizado.</p>;
  }

  const maxByType = Math.max(...data.byConsultation.map((c) => c.count), 1);
  const maxByStatus = Math.max(...data.byStatus.map((s) => s.count), 1);
  const maxMonthly = Math.max(
    ...data.monthlyAppointments.map((m) => m.count),
    1,
  );

  const completionRate =
    data.totalAppointments > 0
      ? Math.round(
          (data.completedAppointments / data.totalAppointments) * 100,
        )
      : 0;

  return (
    <div>
      <h1 className="text-3xl font-bold">Estadísticas</h1>
      <p className="mt-2 text-foreground/60">
        Métricas calculadas desde tu base de datos — sin servicios externos.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total citas", value: data.totalAppointments },
          { label: "Próximas", value: data.upcomingAppointments },
          { label: "Ingresos ($)", value: data.totalRevenue },
          { label: "Pagos pendientes", value: data.pendingPayments },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-foreground/10 bg-white p-5"
          >
            <span className="text-sm text-foreground/50">{s.label}</span>
            <div className="mt-1 text-3xl font-extrabold text-primary">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-foreground/10 bg-white p-5">
          <span className="text-sm text-foreground/50">Tasa de completadas</span>
          <div className="mt-1 text-3xl font-extrabold text-primary">
            {completionRate}%
          </div>
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-white p-5">
          <span className="text-sm text-foreground/50">Canceladas</span>
          <div className="mt-1 text-3xl font-extrabold text-red-600">
            {data.cancelledAppointments}
          </div>
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-white p-5">
          <span className="text-sm text-foreground/50">No asistió</span>
          <div className="mt-1 text-3xl font-extrabold text-red-600">
            {data.noShowCount}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-foreground/10 bg-white p-6">
          <h2 className="font-bold">Por tipo de consulta</h2>
          <div className="mt-4 space-y-4">
            {data.byConsultation.map((c) => (
              <Bar
                key={c.code}
                label={`${c.code} · ${c.name}`}
                value={c.count}
                max={maxByType}
                color="bg-primary"
              />
            ))}
            {data.byConsultation.length === 0 && (
              <p className="text-sm text-foreground/50">Sin datos aún.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-white p-6">
          <h2 className="font-bold">Por estado</h2>
          <div className="mt-4 space-y-4">
            {data.byStatus.map((s) => (
              <Bar
                key={s.status}
                label={appointmentStatusLabels[s.status] ?? s.status}
                value={s.count}
                max={maxByStatus}
                color={
                  s.status === "CANCELLED" || s.status === "NO_SHOW"
                    ? "bg-red-500"
                    : s.status === "CONFIRMED"
                      ? "bg-primary"
                      : "bg-accent"
                }
              />
            ))}
          </div>
        </div>
      </div>

      {data.monthlyAppointments.length > 0 && (
        <div className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
          <h2 className="font-bold">Citas por mes (últimos 6 meses)</h2>
          <div className="mt-4 space-y-4">
            {data.monthlyAppointments.map((m) => (
              <Bar
                key={m.month}
                label={m.month}
                value={m.count}
                max={maxMonthly}
                color="bg-accent"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
