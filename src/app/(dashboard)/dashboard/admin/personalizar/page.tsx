import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { PersonalizarTabs } from "@/components/cms/personalizar-tabs";
import {
  getPaymentCheckoutPolicyAdmin,
  getSiteContents,
  getConsultationTypesAdmin,
} from "@/server/actions/cms.actions";
import { getAllResourcesAdmin } from "@/server/actions/resource.queries";
import {
  getLandingBlocks,
  getLandingImages,
  getNavMenu,
  getProducts,
} from "@/server/queries/landing.queries";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";
import { getAuthBranding } from "@/server/queries/auth-branding.queries";
import { getContactame } from "@/server/queries/contactame.queries";

export const dynamic = "force-dynamic";

export default async function PersonalizarPage() {
  const [
    siteBlocks,
    resources,
    landingImages,
    landingBlocks,
    navMenu,
    products,
    nutricionistaPage,
    paymentCheckoutPolicy,
    packageTypes,
    authBranding,
    contactame,
  ] = await Promise.all([
    getSiteContents(),
    getAllResourcesAdmin(),
    getLandingImages(),
    getLandingBlocks(),
    getNavMenu(),
    getProducts(),
    getNutricionistaPage(),
    getPaymentCheckoutPolicyAdmin(),
    getConsultationTypesAdmin(),
    getAuthBranding(),
    getContactame(),
  ]);

  return (
    <DashboardPage width="wide">
      <ContentLobbyShell
        title="Personalizar sitio"
        description="Edita imágenes, contenido de la página, CV y recursos digitales."
      >
        <PersonalizarTabs
          siteBlocks={siteBlocks}
          resourceCount={resources.length}
          landingImages={landingImages}
          landingBlocks={landingBlocks}
          navMenu={navMenu}
          products={products}
          nutricionistaPage={nutricionistaPage}
          paymentCheckoutPolicy={paymentCheckoutPolicy}
          packageTypes={packageTypes}
          authBranding={authBranding}
          contactame={contactame}
        />
      </ContentLobbyShell>
    </DashboardPage>
  );
}
