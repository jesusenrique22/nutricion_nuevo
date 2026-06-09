import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { LibraryResourceList } from "@/components/resources/resource-catalog";
import { ResourceCatalog } from "@/components/resources/resource-catalog";
import { PatientWeeklyPlanView } from "@/components/weekly-plan/patient-weekly-plan-view";
import {
  getMyLibraryResources,
  getPublishedResources,
} from "@/server/actions/resource.queries";
import { getPublishedWeeklyPlanForPatient } from "@/server/actions/weekly-plan.actions";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PatientLibraryPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [owned, catalog, weeklyPlan] = await Promise.all([
    getMyLibraryResources(),
    getPublishedResources(),
    userId ? getPublishedWeeklyPlanForPatient(userId) : Promise.resolve(null),
  ]);

  const notOwned = catalog.filter(
    (c) => !owned.some((o) => o.id === c.id),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <BrandDashboardHeader
        eyebrow="Plan alimentación"
        title="Recursos y guías"
        description="Material digital de la Lic. Ma Antonieta Lanza."
      />

      <PatientWeeklyPlanView plan={weeklyPlan} />

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
          Mi librería
        </h2>
        <div className="mt-4">
          <LibraryResourceList resources={owned} />
        </div>
      </section>

      {notOwned.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
            Disponibles en tienda
          </h2>
          <div className="mt-4">
            <ResourceCatalog resources={notOwned} />
          </div>
        </section>
      )}
    </div>
  );
}
