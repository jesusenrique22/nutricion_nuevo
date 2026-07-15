import type { PaymentCheckoutPolicy, PaymentMethodId } from "@/types/payment-checkout-policy";
import { PaymentProofUploader } from "@/components/payments/payment-proof-uploader";

const fieldClass =
  "mt-2 w-full resize-none rounded-xl border border-foreground/15 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

export function PaymentMethodsCard({
  policy,
  selectedMethod,
  onSelectMethod,
  reference,
  onReferenceChange,
  proofUrls,
  onProofUrlsChange,
  note,
  onNoteChange,
  totalLabel,
  totalHint,
  requireAllFields = false,
}: {
  policy: PaymentCheckoutPolicy;
  selectedMethod: string | null;
  onSelectMethod: (id: string) => void;
  reference: string;
  onReferenceChange: (value: string) => void;
  proofUrls: string[];
  onProofUrlsChange: (urls: string[]) => void;
  note: string;
  onNoteChange: (value: string) => void;
  totalLabel?: string;
  /** Texto secundario p.ej. total de la cita vs cuota a pagar ahora. */
  totalHint?: string;
  requireAllFields?: boolean;
}) {
  const { contact, methods } = policy;

  return (
    <div className="space-y-6 rounded-3xl border border-primary/15 bg-gradient-to-br from-accent-soft/20 to-white p-6">
      {totalLabel && (
        <div className="rounded-2xl bg-primary/5 px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">
            {totalHint ? "A pagar ahora" : "Total a pagar"}
          </p>
          <p className="mt-1 text-2xl font-bold text-primary">{totalLabel}</p>
          {totalHint ? (
            <p className="mt-1 text-xs text-foreground/55">{totalHint}</p>
          ) : null}
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
          Contáctame
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <span className="font-semibold text-foreground">Teléfono:</span>{" "}
            <a
              href={contact.phoneHref}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {contact.phone}
            </a>
          </li>
          <li>
            <span className="font-semibold text-foreground">Instagram:</span>{" "}
            <a
              href={contact.instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {contact.instagram}
            </a>
          </li>
          <li>
            <span className="font-semibold text-foreground">Email:</span>{" "}
            <a
              href={contact.emailHref}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {contact.email}
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
          Modos de pago
          {requireAllFields && <span className="text-red-600"> *</span>}
        </h3>
        <p className="mt-1 text-xs text-foreground/55">
          Elige cómo vas a pagar. La captura del comprobante es opcional.
          {requireAllFields && " Los campos con * son obligatorios."}
        </p>
        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Selecciona un modo de pago</legend>
          {methods.map((method) => {
            const active = selectedMethod === method.id;
            return (
              <label
                key={method.id}
                className={`flex cursor-pointer rounded-2xl border px-4 py-3 transition ${
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-foreground/10 bg-white hover:border-primary/25"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={active}
                  onChange={() => onSelectMethod(method.id)}
                  className="sr-only"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{method.label}</span>
                  <span className="mt-0.5 block text-sm text-foreground/60">
                    {method.detail}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </div>

      {policy.referenceRequired && (
        <label className="block text-sm">
          <span className="font-semibold text-primary">
            {policy.referenceLabel}
            <span className="text-red-600"> *</span>
          </span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder={policy.referencePlaceholder}
            className={fieldClass}
          />
        </label>
      )}

      <div className="text-sm">
        <span className="font-semibold text-primary">{policy.proofsLabel}</span>
        <p className="mt-0.5 text-xs text-foreground/55">{policy.proofsHint}</p>
        <div className="mt-2">
          <PaymentProofUploader
            maxFiles={policy.maxProofFiles}
            urls={proofUrls}
            onChange={onProofUrlsChange}
          />
        </div>
      </div>

      {policy.showOptionalNote && (
        <label className="block text-sm">
          <span className="font-semibold">{policy.optionalNoteLabel}</span>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={2}
            className={`${fieldClass} min-h-[4.5rem] overflow-y-auto`}
            placeholder={policy.optionalNotePlaceholder}
          />
        </label>
      )}
    </div>
  );
}

export type { PaymentMethodId };
