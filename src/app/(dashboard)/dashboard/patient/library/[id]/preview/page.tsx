import Link from "next/link";
import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { ResourceCoverImage } from "@/components/resources/resource-cover-image";
import { isDisplayableCoverUrl } from "@/lib/resource-cover";
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
        eyebrow="Vista previa"
        description={resource.description ?? undefined}
      />
      {resource.coverUrl && isDisplayableCoverUrl(resource.coverUrl) && (
        <div className="relative aspect-video overflow-hidden rounded-3xl ring-1 ring-primary/10">
          <ResourceCoverImage src={resource.coverUrl} alt={resource.title} />
        </div>
      )}
      <form action={addToCart}>
        <button
          type="submit"
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Agregar al carrito para solicitar acceso
        </button>
      </form>
    </div>
  );
}
