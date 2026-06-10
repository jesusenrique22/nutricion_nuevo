import Link from "next/link";
import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { getPatientsList } from "@/server/actions/patient.queries";

export default async function PatientsPage() {
  const patients = await getPatientsList();

  return (
    <ContentLobbyShell
      title="Pacientes"
      description="Expedientes, anamnesis y seguimientos de tus pacientes."
    >
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {patients.length === 0 && (
          <p className="rounded-2xl border border-foreground/10 bg-white px-5 py-8 text-center text-sm text-foreground/50">
            Aún no hay pacientes registrados.
          </p>
        )}
        {patients.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-foreground/10 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="min-w-0 flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="mt-1 text-sm text-foreground/60">{p.email}</div>
              </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  p.hasCompletedIntake
                    ? "bg-primary/15 text-primary"
                    : "bg-accent/15 text-accent"
                }`}
              >
                {p.hasCompletedIntake ? "Ingreso completo" : "Ingreso pendiente"}
              </span>
              <span className="text-xs text-foreground/50">
                {p.appointmentCount} citas
              </span>
            </div>
            <Link
              href={`/dashboard/admin/patients/${p.id}`}
              className="mt-4 inline-block text-sm font-semibold text-accent"
            >
              Ver ficha →
            </Link>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-foreground/10 bg-white md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-foreground/10 bg-muted/50">
            <tr>
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Ingreso</th>
              <th className="px-5 py-3 font-semibold">Citas</th>
              <th className="px-5 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-foreground/50"
                >
                  Aún no hay pacientes registrados.
                </td>
              </tr>
            )}
            {patients.map((p) => (
              <tr
                key={p.id}
                className="border-b border-foreground/5 transition hover:bg-muted/30 last:border-0"
              >
                <td className="px-5 py-4 font-medium">{p.name}</td>
                <td className="px-5 py-4 text-foreground/60">{p.email}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      p.hasCompletedIntake
                        ? "bg-primary/15 text-primary"
                        : "bg-accent/15 text-accent"
                    }`}
                  >
                    {p.hasCompletedIntake ? "Completo" : "Pendiente"}
                  </span>
                </td>
                <td className="px-5 py-4">{p.appointmentCount}</td>
                <td className="px-5 py-4">
                  <Link
                    href={`/dashboard/admin/patients/${p.id}`}
                    className="font-semibold text-accent hover:underline"
                  >
                    Ver ficha
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContentLobbyShell>
  );
}
