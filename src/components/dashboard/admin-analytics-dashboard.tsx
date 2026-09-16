import { appointmentStatusLabels } from "@/lib/appointment-labels";
import {
  AnalyticsDetailCard,
  CancelledAppointmentRow,
  PendingPaymentRow,
  UpcomingAppointmentRow,
} from "@/components/dashboard/analytics-detail-card";
import type { AnalyticsSummary } from "@/server/actions/analytics.queries";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#e8b4c8",
  CONFIRMED: "#741e31",
  COMPLETED: "#5a8f6f",
  CANCELLED: "#c94b4b",
  NO_SHOW: "#9b2c2c",
};

function KpiCard({
  label,
  value,
  hint,
  accent = "primary",
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: "primary" | "accent" | "warning" | "danger";
}) {
  const glows = {
    primary: "from-primary/15 to-primary/5",
    accent: "from-accent/40 to-accent/10",
    warning: "from-amber-200/60 to-amber-100/20",
    danger: "from-red-200/60 to-red-100/20",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-foreground/8 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-80 blur-2xl ${glows[accent]}`}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
        {label}
      </p>
      <p className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-foreground/50">{hint}</p>
      ) : null}
    </div>
  );
}

function ProgressRing({
  value,
  size = 112,
  stroke = 9,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(116 30 49 / 0.08)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#741e31"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function DistributionBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return (
      <div className="h-3 rounded-full bg-foreground/6" aria-hidden />
    );
  }

  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-foreground/6">
      {segments.map((s) => (
        <div
          key={s.label}
          className="h-full transition-[width]"
          style={{
            width: `${(s.value / total) * 100}%`,
            backgroundColor: s.color,
          }}
          title={`${s.label}: ${s.value}`}
        />
      ))}
    </div>
  );
}

function RankedBars({
  items,
  max,
  colorFor,
}: {
  items: { key: string; label: string; value: number }[];
  max: number;
  colorFor?: (key: string) => string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-foreground/50">Sin datos aún.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const pct = max > 0 ? Math.round((item.value / max) * 100) : 0;
        const barColor = colorFor?.(item.key) ?? "#741e31";

        return (
          <div key={item.key}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-[11px] font-bold text-foreground/40">
                  {index + 1}
                </span>
                <span className="truncate text-sm font-semibold">
                  {item.label}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-foreground/5 px-2.5 py-0.5 text-xs font-bold tabular-nums">
                {item.value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-foreground/6">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyBars({
  items,
  max,
}: {
  items: { month: string; count: number }[];
  max: number;
}) {
  return (
    <div className="flex h-44 items-end justify-between gap-2 sm:gap-3">
      {items.map((m) => {
        const height = max > 0 ? Math.max(8, (m.count / max) * 100) : 8;

        return (
          <div
            key={m.month}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <span className="text-xs font-bold tabular-nums text-primary">
              {m.count}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-primary to-accent/80"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] font-semibold uppercase tracking-wide text-foreground/45">
              {m.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminAnalyticsDashboard({ data }: { data: AnalyticsSummary }) {
  const maxByType = Math.max(...data.byConsultation.map((c) => c.count), 1);
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

  const statusSegments = data.byStatus.map((s) => ({
    label: appointmentStatusLabels[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#741e31",
  }));

  const attentionCount = data.cancelledAppointments + data.noShowCount;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary via-primary to-[#5a1726] px-6 py-8 text-white shadow-lg sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft/90">
          Panel clínico
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Estadísticas
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/75">
          Resumen de citas, estados y tendencias calculado desde tu base de
          datos — sin servicios externos.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total citas"
          value={data.totalAppointments}
          hint="Historial completo registrado"
          accent="primary"
        />
        <AnalyticsDetailCard
          label="Próximas"
          value={data.upcomingAppointments}
          hint="Pendientes o confirmadas por venir"
          accent="accent"
          emptyLabel="No hay citas agendadas por delante."
        >
          {data.upcomingList.map((row) => (
            <UpcomingAppointmentRow key={row.id} row={row} />
          ))}
        </AnalyticsDetailCard>
        <AnalyticsDetailCard
          label="Pagos pendientes"
          value={data.pendingPayments}
          hint="Cobros aún sin completar"
          accent="warning"
          emptyLabel="No hay cobros pendientes."
        >
          {data.pendingPaymentsList.map((row) => (
            <PendingPaymentRow key={row.id} row={row} />
          ))}
        </AnalyticsDetailCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-foreground/8 bg-white p-6 shadow-sm lg:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
            Rendimiento
          </p>
          <h2 className="mt-1 text-lg font-bold">Tasa de completadas</h2>
          <div className="mt-6 flex items-center gap-5">
            <div className="relative shrink-0">
              <ProgressRing value={completionRate} />
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold text-primary">
                {completionRate}%
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-bold text-primary">
                  {data.completedAppointments}
                </span>{" "}
                <span className="text-foreground/55">completadas</span>
              </p>
              <p>
                <span className="font-bold text-foreground/70">
                  {data.totalAppointments}
                </span>{" "}
                <span className="text-foreground/55">en total</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <AnalyticsDetailCard
            label="Canceladas"
            value={data.cancelledAppointments}
            hint="Citas anuladas por paciente o consulta"
            accent="danger"
            emptyLabel="Ninguna cita cancelada."
          >
            {data.cancelledList.map((row) => (
              <CancelledAppointmentRow key={row.id} row={row} />
            ))}
          </AnalyticsDetailCard>
          <KpiCard
            label="No asistió"
            value={data.noShowCount}
            hint="Ausencias sin aviso previo"
            accent="danger"
          />
          <div className="sm:col-span-2 rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50/80 to-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700/60">
              Atención
            </p>
            <p className="mt-2 text-sm text-foreground/65">
              <span className="text-2xl font-extrabold text-red-700">
                {attentionCount}
              </span>{" "}
              citas requieren seguimiento (canceladas + no asistió).
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-foreground/8 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
                Distribución
              </p>
              <h2 className="mt-1 text-lg font-bold">Por tipo de consulta</h2>
            </div>
            <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-bold text-primary">
              {data.byConsultation.length} tipos
            </span>
          </div>
          <div className="mt-6">
            <RankedBars
              items={data.byConsultation.map((c) => ({
                key: c.code,
                label: c.name,
                value: c.count,
              }))}
              max={maxByType}
            />
          </div>
        </article>

        <article className="rounded-2xl border border-foreground/8 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
              Estado actual
            </p>
            <h2 className="mt-1 text-lg font-bold">Por estado de cita</h2>
          </div>
          <div className="mt-6">
            <DistributionBar segments={statusSegments} />
          </div>
          <ul className="mt-5 space-y-3">
            {data.byStatus.map((s) => (
              <li
                key={s.status}
                className="flex items-center justify-between gap-3 rounded-xl bg-foreground/[0.03] px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        STATUS_COLORS[s.status] ?? "#741e31",
                    }}
                  />
                  <span className="text-sm font-semibold">
                    {appointmentStatusLabels[s.status] ?? s.status}
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums text-primary">
                  {s.count}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {data.monthlyAppointments.length > 0 ? (
        <article className="rounded-2xl border border-foreground/8 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
                Tendencia
              </p>
              <h2 className="mt-1 text-lg font-bold">
                Citas por mes (últimos 6 meses)
              </h2>
            </div>
            <p className="text-xs text-foreground/45">
              Volumen mensual de citas agendadas
            </p>
          </div>
          <div className="mt-8">
            <MonthlyBars items={data.monthlyAppointments} max={maxMonthly} />
          </div>
        </article>
      ) : null}
    </div>
  );
}
