import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { PersonalizarTabs } from "@/components/cms/personalizar-tabs";
import {
  getConsultationTypesAdmin,
  getFormTemplates,
  getPaymentChatPolicyAdmin,
  getSiteContents,
} from "@/server/actions/cms.actions";
import { getAllResourcesAdmin } from "@/server/actions/resource.queries";
import { getLandingImages } from "@/server/queries/landing.queries";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";

export const dynamic = "force-dynamic";

export default async function PersonalizarPage() {
  const [types, siteBlocks, templates, resources, landingImages, nutricionistaPage, paymentPolicy] =
    await Promise.all([
      getConsultationTypesAdmin(),
      getSiteContents(),
      getFormTemplates(),
      getAllResourcesAdmin(),
      getLandingImages(),
      getNutricionistaPage(),
      getPaymentChatPolicyAdmin(),
    ]);

  return (
    <ContentLobbyShell
      title="Personalizar sitio"
      description="Edita imágenes, precios, contenido de la página, CV, formularios y recursos digitales."
    >
      <PersonalizarTabs
        consultationTypes={types}
        siteBlocks={siteBlocks}
        formTemplates={templates}
        resourceCount={resources.length}
        landingImages={landingImages}
        nutricionistaPage={nutricionistaPage}
        paymentPolicy={paymentPolicy}
      />
    </ContentLobbyShell>
  );
}
