import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { PersonalizarTabs } from "@/components/cms/personalizar-tabs";
import {
  getConsultationTypesAdmin,
  getFormTemplates,
  getSiteContents,
} from "@/server/actions/cms.actions";
import { getAllResourcesAdmin } from "@/server/actions/resource.queries";
import { getLandingImages } from "@/server/queries/landing.queries";

export const dynamic = "force-dynamic";

export default async function PersonalizarPage() {
  const [types, siteBlocks, templates, resources, landingImages] =
    await Promise.all([
      getConsultationTypesAdmin(),
      getSiteContents(),
      getFormTemplates(),
      getAllResourcesAdmin(),
      getLandingImages(),
    ]);

  return (
    <ContentLobbyShell
      title="Personalizar sitio"
      description="Edita imágenes, precios, contenido de la página, formularios y recursos digitales."
    >
      <PersonalizarTabs
        consultationTypes={types}
        siteBlocks={siteBlocks}
        formTemplates={templates}
        resourceCount={resources.length}
        landingImages={landingImages}
      />
    </ContentLobbyShell>
  );
}
