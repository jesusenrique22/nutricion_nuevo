import { PaymentProofGallery } from "@/components/payments/payment-proof-gallery";

export function PaymentPatientEvidence({
  paymentMethod,
  patientReference,
  patientNote,
  proofUrls = [],
}: {
  paymentMethod?: string | null;
  patientReference?: string | null;
  patientNote?: string | null;
  proofUrls?: string[];
}) {
  const hasContent =
    paymentMethod ||
    patientReference ||
    patientNote ||
    proofUrls.length > 0;

  if (!hasContent) {
    return (
      <p className="text-sm text-foreground/50">
        El paciente aún no envió referencia ni comprobantes.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {paymentMethod && (
        <p>
          <span className="font-semibold">Modo de pago:</span> {paymentMethod}
        </p>
      )}
      {patientReference && (
        <p>
          <span className="font-semibold">N.º de referencia:</span>{" "}
          <span className="font-mono text-primary">{patientReference}</span>
        </p>
      )}
      {patientNote && (
        <p className="text-foreground/70">
          <span className="font-semibold">Nota del paciente:</span>{" "}
          {patientNote}
        </p>
      )}
      <PaymentProofGallery urls={proofUrls} />
    </div>
  );
}
