import { notFound } from "next/navigation";
import Link from "next/link";
import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { ResourceViewer } from "@/components/resources/resource-viewer";
import { getResourceById } from "@/server/actions/resource.queries";

export const dynamic = "force-dynamic";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resource = await getResourceById(id);
  if (!resource?.owned) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard/patient/library"
        className="inline-flex text-sm font-semibold text-accent"
      >
        ← Volver a recursos
      </Link>
      <BrandDashboardHeader title={resource.title} eyebrow="Recurso desbloqueado" />
      <ResourceViewer resource={resource} />
    </div>
  );
}
