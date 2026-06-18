import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { PersonalizarTabs } from "@/components/cms/personalizar-tabs";
import {
  getPaymentCheckoutPolicyAdmin,
  getSiteContents,
} from "@/server/actions/cms.actions";
import { getAllResourcesAdmin } from "@/server/actions/resource.queries";
import { getLandingImages } from "@/server/queries/landing.queries";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";

export const dynamic = "force-dynamic";

export default async function PersonalizarPage() {
  const [siteBlocks, resources, landingImages, nutricionistaPage, paymentCheckoutPolicy] =
    await Promise.all([
      getSiteContents(),
      getAllResourcesAdmin(),
      getLandingImages(),
      getNutricionistaPage(),
      getPaymentCheckoutPolicyAdmin(),
    ]);

  return (
    <ContentLobbyShell
      title="Personalizar sitio"
      description="Edita imágenes, contenido de la página, CV y recursos digitales."
    >
      <PersonalizarTabs
        siteBlocks={siteBlocks}
        resourceCount={resources.length}
        landingImages={landingImages}
        nutricionistaPage={nutricionistaPage}
        paymentCheckoutPolicy={paymentCheckoutPolicy}
      />
    </ContentLobbyShell>
  );
}
