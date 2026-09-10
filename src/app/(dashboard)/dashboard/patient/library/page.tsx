import {
  LibraryResourceList,
  PendingResourceList,
  ResourceCatalog,
} from "@/components/resources/resource-catalog";
import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import {
  getAvailableResourcesForPatient,
  getMyLibraryResources,
  getMyPendingResources,
} from "@/server/actions/resource.queries";

export const dynamic = "force-dynamic";

export default async function PatientLibraryPage() {
  const [owned, pending, available] = await Promise.all([
    getMyLibraryResources(),
    getMyPendingResources(),
    getAvailableResourcesForPatient(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <BrandDashboardHeader
        eyebrow="Material digital"
        title="Recursos"
        description="Contenido publicado por la Lic. Ma Antonieta Lanza. Solo lectura en la plataforma."
      />

      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-amber-800">
              En proceso
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              {pending.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground/55">
            Pagos en verificación. Te notificaremos cuando se apruebe el acceso.
          </p>
          <div className="mt-4">
            <PendingResourceList resources={pending} />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
          Comprados
        </h2>
        <p className="mt-1 text-sm text-foreground/55">
          Recursos desbloqueados tras verificar tu pago.
        </p>
        <div className="mt-4">
          <LibraryResourceList resources={owned} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
          Disponibles
        </h2>
        <p className="mt-1 text-sm text-foreground/55">
          Agrega al carrito para solicitar acceso.
        </p>
        <div className="mt-4">
          <ResourceCatalog resources={available} />
        </div>
      </section>
    </div>
  );
}
