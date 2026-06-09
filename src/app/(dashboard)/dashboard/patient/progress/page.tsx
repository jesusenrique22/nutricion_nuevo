import { getMyMeasurements } from "@/server/actions/patient.queries";
import {
  BrandDashboardHeader,
  BrandDataTable,
  BrandMetricCard,
} from "@/components/brand/brand-dashboard-shell";
import {
  ProgressLineChart,
  buildChartPoints,
} from "@/components/measurements/progress-line-chart";
import Link from "next/link";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PatientProgressPage() {
  const measurements = await getMyMeasurements();
  const latest = measurements[0];

  const weightChart = buildChartPoints(
    measurements.map((m) => ({ measuredAt: m.measuredAt, value: m.weight })),
  );
  const fatChart = buildChartPoints(
    measurements.map((m) => ({
      measuredAt: m.measuredAt,
      value: m.bodyFatPct,
    })),
  );
  const waistChart = buildChartPoints(
    measurements.map((m) => ({ measuredAt: m.measuredAt, value: m.waist })),
  );

  const tableRows = measurements.map((m) => ({
    date: fmt(m.measuredAt),
    weight: m.weight != null ? `${m.weight} kg` : "—",
    fat: m.bodyFatPct != null ? `${m.bodyFatPct}%` : "—",
    muscle: m.muscleMass != null ? `${m.muscleMass} kg` : "—",
    waist: m.waist != null ? `${m.waist} cm` : "—",
    hip: m.hip != null ? `${m.hip} cm` : "—",
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <BrandDashboardHeader
        eyebrow="Estadísticas"
        title="Mi progreso"
        description="Evolución de tus mediciones antropométricas registradas en consulta ISAK."
        action={{
          href: "/dashboard/patient/appointments",
          label: "Agendar medición",
        }}
      />

      {measurements.length === 0 ? (
        <div className="rounded-3xl bg-gradient-to-br from-accent-soft/30 to-muted/20 px-6 py-14 text-center ring-1 ring-primary/10 sm:px-10">
          <p className="text-lg font-extralight uppercase text-primary">
            Sin mediciones aún
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-foreground/65">
            Las mediciones se registran después de consultas de antropometría.
            Cuando tengas tu primera medición, verás gráficos y tablas aquí.
          </p>
          <Link
            href="/dashboard/patient/appointments"
            className="mt-6 inline-block rounded-full border border-primary px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            Reservá un turno
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {latest?.weight != null && (
              <BrandMetricCard
                label="Último peso"
                value={latest.weight}
                unit="kg"
                date={fmt(latest.measuredAt)}
              />
            )}
            {latest?.bodyFatPct != null && (
              <BrandMetricCard
                label="% Grasa corporal"
                value={latest.bodyFatPct}
                unit="%"
              />
            )}
            {latest?.waist != null && (
              <BrandMetricCard
                label="Cintura"
                value={latest.waist}
                unit="cm"
              />
            )}
            {latest?.muscleMass != null && (
              <BrandMetricCard
                label="Masa muscular"
                value={latest.muscleMass}
                unit="kg"
              />
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {weightChart.length > 0 && (
              <ProgressLineChart
                title="Peso"
                unit="kg"
                data={weightChart}
                color="#741e31"
              />
            )}
            {fatChart.length > 0 && (
              <ProgressLineChart
                title="% Grasa corporal"
                unit="%"
                data={fatChart}
                color="#5a1728"
              />
            )}
            {waistChart.length > 0 && (
              <ProgressLineChart
                title="Cintura"
                unit="cm"
                data={waistChart}
                color="#e8b4c8"
              />
            )}
          </div>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
              Historial de mediciones
            </h2>
            <div className="mt-4">
              <BrandDataTable
                columns={[
                  { key: "date", label: "Fecha" },
                  { key: "weight", label: "Peso" },
                  { key: "fat", label: "% Grasa" },
                  { key: "muscle", label: "Músculo" },
                  { key: "waist", label: "Cintura" },
                  { key: "hip", label: "Cadera" },
                ]}
                rows={tableRows}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
