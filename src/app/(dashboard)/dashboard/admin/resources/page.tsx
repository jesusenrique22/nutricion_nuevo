import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { AdminResourceManager } from "@/components/resources/admin-resource-manager";
import { getAllResourcesAdmin } from "@/server/actions/resource.queries";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  const resources = await getAllResourcesAdmin();

  return (
    <ContentLobbyShell
      title="Recursos"
      description="E-books, videos y enlaces para tus pacientes."
    >
      <AdminResourceManager resources={resources} />
    </ContentLobbyShell>
  );
}
