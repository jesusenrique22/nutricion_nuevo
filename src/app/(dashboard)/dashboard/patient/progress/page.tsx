import Link from "next/link";
import { getMyMeasurements } from "@/server/actions/patient.queries";
import { getMyProgressPurchases } from "@/server/actions/patient-progress.queries";
import {
  BrandDashboardHeader,
  BrandDataTable,
  BrandMetricCard,
} from "@/components/brand/brand-dashboard-shell";
import {
  ProgressLineChart,
  buildChartPoints,
} from "@/components/measurements/progress-line-chart";
import { PatientPurchasesPanel } from "@/components/progress/patient-purchases-panel";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PatientProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const params = await searchParams;
  const [purchases, measurements] = await Promise.all([
    getMyProgressPurchases(),
    getMyMeasurements(),
  ]);
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
        eyebrow="Panel paciente"
        title="Mi progreso"
        description="Seguí tus compras, citas y mediciones en un solo lugar."
        action={{
          href: "/dashboard/patient/cart",
          label: "Ir al carrito",
        }}
      />

      {params.pedido === "ok" && (
        <p className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground/75">
          Pedido confirmado. Tu pago está en revisión y aparece abajo en tu
          progreso.
        </p>
      )}

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
          Mis compras y citas
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          Acá ves lo que agendaste o compraste. Podés solicitar reembolso cuando
          lo necesites.
        </p>
        <div className="mt-4">
          <PatientPurchasesPanel items={purchases} />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
              Mediciones antropométricas
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
              Evolución registrada en consultas ISAK.
            </p>
          </div>
          <Link
            href="/dashboard/patient/appointments"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Agendar medición
          </Link>
        </div>

        {measurements.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-gradient-to-br from-accent-soft/30 to-muted/20 px-6 py-14 text-center ring-1 ring-primary/10 sm:px-10">
            <p className="text-lg font-extralight uppercase text-primary">
              Sin mediciones aún
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm text-foreground/65">
              Las mediciones se registran después de consultas de antropometría.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
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
        )}
      </section>
    </div>
  );
}
