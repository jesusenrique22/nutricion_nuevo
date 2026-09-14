import Link from "next/link";
import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { ResourceCoverImage } from "@/components/resources/resource-cover-image";
import { isDisplayableCoverUrl } from "@/lib/resource-cover";
import { ResourcePendingBadge } from "@/components/resources/resource-catalog";
import { getPublishedResources } from "@/server/actions/resource.queries";
import { addResourceToCart } from "@/server/actions/cart.actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ResourcePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resources = await getPublishedResources();
  const resource = resources.find((r) => r.id === id);
  if (!resource) redirect("/dashboard/patient/library");

  if (resource.owned) {
    redirect(`/dashboard/patient/library/${id}`);
  }

  const isPendingReview = resource.accessStatus === "PENDING";

  async function addToCart() {
    "use server";
    await addResourceToCart(id);
    redirect("/dashboard/patient/cart");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/patient/library"
        className="inline-flex text-sm font-semibold text-accent"
      >
        ← Volver a recursos
      </Link>
      <BrandDashboardHeader
        title={resource.title}
        eyebrow={isPendingReview ? "Pago en revisión" : "Vista previa"}
        description={resource.description ?? undefined}
      />
      {isPendingReview ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4">
          <ResourcePendingBadge />
          <p className="mt-3 text-sm text-amber-950/90">
            Tu compra está pendiente de aprobación. Anttova revisará el
            comprobante y te avisará cuando puedas abrir la guía aquí.
          </p>
        </div>
      ) : null}
      {resource.coverUrl && isDisplayableCoverUrl(resource.coverUrl) && (
        <div className="relative aspect-video overflow-hidden rounded-3xl ring-1 ring-primary/10">
          <ResourceCoverImage src={resource.coverUrl} alt={resource.title} />
        </div>
      )}
      {!isPendingReview ? (
        <form action={addToCart}>
          <button
            type="submit"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Agregar al carrito para solicitar acceso
          </button>
        </form>
      ) : (
        <Link
          href="/dashboard/patient/cart/historial?tab=processing"
          className="inline-flex rounded-full border border-amber-300 bg-white px-6 py-3 text-sm font-semibold text-amber-900"
        >
          Ver estado en historial
        </Link>
      )}
    </div>
  );
}
