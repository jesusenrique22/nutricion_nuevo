import {
  LibraryResourceList,
  ResourceCatalog,
} from "@/components/resources/resource-catalog";
import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import {
  getAvailableResourcesForPatient,
  getMyLibraryResources,
} from "@/server/actions/resource.queries";

export const dynamic = "force-dynamic";

export default async function PatientLibraryPage() {
  const [owned, available] = await Promise.all([
    getMyLibraryResources(),
    getAvailableResourcesForPatient(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <BrandDashboardHeader
        eyebrow="Material digital"
        title="Recursos"
        description="Contenido publicado por la Lic. Ma Antonieta Lanza. Solo lectura en la plataforma."
      />

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
