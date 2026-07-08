import Link from "next/link";
import { getMyAdminResource } from "@/server/actions/patient.queries";
import { getMyAppointments } from "@/server/actions/booking.queries";
import {
  getMyPendingPayments,
  getMyProgressPurchases,
} from "@/server/actions/patient-progress.queries";
import { isPendingProgressItem } from "@/lib/patient-progress";
import { getMyLibraryResources } from "@/server/actions/resource.queries";
import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { LibraryResourceList } from "@/components/resources/resource-catalog";
import { PatientAdminResourceCard } from "@/components/patient/patient-admin-resource-card";
import { PatientAppointmentsSummary } from "@/components/progress/patient-appointments-summary";
import { PatientPendingPaymentsPanel } from "@/components/progress/patient-pending-payments-panel";
import { PatientPurchasesPanel } from "@/components/progress/patient-purchases-panel";
import { ArrowRightIcon } from "@/components/ui/link-icons";

export default async function PatientProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const params = await searchParams;
  const [pendingPayments, purchases, resources, adminResource, appointments] =
    await Promise.all([
      getMyPendingPayments(),
      getMyProgressPurchases(),
      getMyLibraryResources(),
      getMyAdminResource(),
      getMyAppointments(),
    ]);

  const purchaseHistory = purchases.filter((item) => !isPendingProgressItem(item));

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <BrandDashboardHeader
        eyebrow="Panel paciente"
        title="Mi progreso"
        description="Historial de tu cuenta: pagos, recursos, citas y material compartido por tu nutricionista."
        action={{
          href: "/dashboard/patient/cart",
          label: "Ir al carrito",
        }}
      />

      {params.pedido === "ok" && (
        <p className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground/75">
          Pedido confirmado. Tu pago está en revisión y aparece en pagos
          pendientes.
        </p>
      )}

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
          Pagos pendientes
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          Comprobantes enviados que Anttova aún está verificando.
        </p>
        <div className="mt-4">
          <PatientPendingPaymentsPanel items={pendingPayments} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
          Material de tu nutricionista
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          Enlaces o archivos que la Lic. Ma Antonieta Lanza compartió con vos.
        </p>
        <div className="mt-4">
          {adminResource ? (
            <PatientAdminResourceCard
              url={adminResource.url}
              note={adminResource.note}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-foreground/15 bg-white/60 px-6 py-10 text-center">
              <p className="text-sm text-foreground/60">
                Cuando tu nutricionista comparta material personalizado, va a
                aparecer acá.
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
              Mis recursos
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
              Contenido digital con acceso activo en tu biblioteca.
            </p>
          </div>
          <Link
            href="/dashboard/patient/library"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Ver biblioteca
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-4">
          <LibraryResourceList resources={resources} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
          Historial de pagos y compras
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          Citas y recursos confirmados. Podés solicitar reembolso cuando lo
          necesites.
        </p>
        <div className="mt-4">
          <PatientPurchasesPanel items={purchaseHistory} />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
              Mis citas
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
              Consultas agendadas y su estado de pago.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <PatientAppointmentsSummary appointments={appointments} />
        </div>
      </section>
    </div>
  );
}
