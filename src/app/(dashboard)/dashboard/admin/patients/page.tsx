import Link from "next/link";
import { getPatientsList } from "@/server/actions/patient.queries";

export default async function PatientsPage() {
  const patients = await getPatientsList();

  return (
    <div>
      <h1 className="text-3xl font-bold">Pacientes</h1>
      <p className="mt-2 text-foreground/60">
        Expedientes, anamnesis y seguimientos de tus pacientes.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-foreground/10 bg-white">
        <table className="w-full text-left text-sm">
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
                <td colSpan={5} className="px-5 py-8 text-center text-foreground/50">
                  Aún no hay pacientes registrados.
                </td>
              </tr>
            )}
            {patients.map((p) => (
              <tr
                key={p.id}
                className="border-b border-foreground/5 last:border-0"
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
                    className="font-semibold text-primary hover:underline"
                  >
                    Ver ficha
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
