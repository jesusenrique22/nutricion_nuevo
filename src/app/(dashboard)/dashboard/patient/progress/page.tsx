import { getMyMeasurements } from "@/server/actions/patient.queries";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PatientProgressPage() {
  const measurements = await getMyMeasurements();

  return (
    <div>
      <h1 className="text-3xl font-bold">Mi progreso</h1>
      <p className="mt-2 text-foreground/60">
        Historial de tus mediciones antropométricas.
      </p>

      {measurements.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-foreground/10 bg-white p-8 text-center">
          <p className="text-foreground/60">
            Aún no tienes mediciones registradas.
          </p>
          <p className="mt-2 text-sm text-foreground/50">
            Las mediciones se registran en consultas de Antropometría (ANT-03).
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {measurements[0]?.weight && (
              <div className="rounded-2xl border border-foreground/10 bg-white p-5">
                <span className="text-sm text-foreground/50">Último peso</span>
                <div className="mt-1 text-3xl font-extrabold text-primary">
                  {measurements[0].weight} kg
                </div>
                <span className="text-xs text-foreground/40">
                  {fmt(measurements[0].measuredAt)}
                </span>
              </div>
            )}
            {measurements[0]?.bodyFatPct && (
              <div className="rounded-2xl border border-foreground/10 bg-white p-5">
                <span className="text-sm text-foreground/50">% Grasa</span>
                <div className="mt-1 text-3xl font-extrabold text-primary">
                  {measurements[0].bodyFatPct}%
                </div>
              </div>
            )}
            {measurements[0]?.waist && (
              <div className="rounded-2xl border border-foreground/10 bg-white p-5">
                <span className="text-sm text-foreground/50">Cintura</span>
                <div className="mt-1 text-3xl font-extrabold text-primary">
                  {measurements[0].waist} cm
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-foreground/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-foreground/10 bg-muted/50">
                <tr>
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold">Peso</th>
                  <th className="px-5 py-3 font-semibold">% Grasa</th>
                  <th className="px-5 py-3 font-semibold">Cintura</th>
                  <th className="px-5 py-3 font-semibold">Cadera</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-foreground/5 last:border-0"
                  >
                    <td className="px-5 py-3">{fmt(m.measuredAt)}</td>
                    <td className="px-5 py-3">
                      {m.weight ? `${m.weight} kg` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {m.bodyFatPct ? `${m.bodyFatPct}%` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {m.waist ? `${m.waist} cm` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {m.hip ? `${m.hip} cm` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
