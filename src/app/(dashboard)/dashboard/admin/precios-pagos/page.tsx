import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { ConsultationPricesEditor } from "@/components/cms/consultation-prices-editor";
import { CurrencyPolicyEditor } from "@/components/cms/currency-policy-editor";
import { PaymentChatPolicyEditor } from "@/components/cms/payment-chat-policy-editor";
import { getConsultationTypesAdmin, getPaymentChatPolicyAdmin } from "@/server/actions/cms.actions";
import {
  getCurrencyPolicyAdmin,
  getPublicExchangeRates,
} from "@/server/actions/currency.actions";

export const dynamic = "force-dynamic";

export default async function AdminPreciosPagosPage() {
  const [consultationTypes, paymentPolicy, currencyPolicy, exchangeRates] =
    await Promise.all([
      getConsultationTypesAdmin(),
      getPaymentChatPolicyAdmin(),
      getCurrencyPolicyAdmin(),
      getPublicExchangeRates(),
    ]);

  return (
    <ContentLobbyShell
      title="Precios y Cotización"
      description="Cotización del dólar blue, montos de consultas, adelantos y política de pagos en toda la plataforma."
    >
      <div className="space-y-6">
        <CurrencyPolicyEditor
          initial={currencyPolicy}
          initialRates={exchangeRates}
        />
        <PaymentChatPolicyEditor
          initial={paymentPolicy}
          consultationTypes={consultationTypes}
        />
        <ConsultationPricesEditor types={consultationTypes} />
      </div>
    </ContentLobbyShell>
  );
}
