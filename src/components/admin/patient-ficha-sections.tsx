import type { ReactNode } from "react";
import { AdminBookAppointmentForm } from "@/components/admin/admin-book-appointment-form";
import { PatientFichaAppointmentCard } from "@/components/admin/patient-ficha-appointment-card";
import { PatientFichaPendingPayments } from "@/components/admin/patient-ficha-pending-payments";
import { PatientResourceAccessPanel } from "@/components/admin/patient-resource-access-panel";
import type { AdminPendingPaymentItem } from "@/server/actions/payment-admin.queries";
import type {
  PatientFichaAppointment,
  PatientFichaPurchase,
} from "@/server/actions/patient.queries";
import type { ConsultationTypeDTO } from "@/server/actions/booking.queries";
import type { ResourceDTO } from "@/server/actions/resource.queries";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 w-full rounded-2xl border border-foreground/10 bg-white p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-foreground/50">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PatientFichaSections({
  patientId,
  appointments,
  purchases,
  pendingPayments,
  consultationTypes,
  resourceCatalog,
}: {
  patientId: string;
  appointments: PatientFichaAppointment[];
  purchases: PatientFichaPurchase[];
  pendingPayments: AdminPendingPaymentItem[];
  consultationTypes: ConsultationTypeDTO[];
  resourceCatalog: ResourceDTO[];
}) {
  return (
    <>
      <Section
        title="Consultas"
        description="Historial de citas agendadas con este paciente."
      >
        <AdminBookAppointmentForm
          patientId={patientId}
          consultationTypes={consultationTypes}
        />
        {appointments.length === 0 ? (
          <p className="text-sm text-foreground/50">
            Este paciente aún no tiene consultas registradas.
          </p>
        ) : (
          <div className="space-y-3">
            {appointments.map((a) => (
              <PatientFichaAppointmentCard key={a.id} appointment={a} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Recursos y paquetes"
        description="Desbloqueá contenido pagado o asigná recursos del catálogo."
      >
        <PatientResourceAccessPanel
          patientId={patientId}
          purchases={purchases}
          catalog={resourceCatalog}
        />
      </Section>

      <Section
        title="Pagos pendientes"
        description="Pagos que aún requieren revisión o confirmación."
      >
        <PatientFichaPendingPayments items={pendingPayments} />
      </Section>
    </>
  );
}
