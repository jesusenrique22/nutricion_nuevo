import Link from "next/link";
import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { ResourceCatalog } from "@/components/resources/resource-catalog";
import { getPublishedResources } from "@/server/actions/resource.queries";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const session = await auth();
  const resources = await getPublishedResources();

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <ContentLobbyShell
          title="E-Resources"
          description="E-books, videos y material exclusivo Anttova."
        >
          {!session?.user && (
            <p className="mb-6 rounded-xl bg-accent/10 px-4 py-3 text-sm">
              <Link href="/login" className="font-semibold text-primary">
                Inicia sesión
              </Link>{" "}
              para solicitar acceso a recursos de pago.
            </p>
          )}
          <ResourceCatalog resources={resources} />
        </ContentLobbyShell>
      </div>
    </div>
  );
}
