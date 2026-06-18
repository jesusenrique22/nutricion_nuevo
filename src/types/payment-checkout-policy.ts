export const PAYMENT_CHECKOUT_POLICY_SLUG = "payment_checkout_policy";

export type PaymentMethodId = "zelle" | "mercado_pago";

export interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
  detail: string;
}

export interface PaymentContactInfo {
  phone: string;
  phoneHref: string;
  instagram: string;
  instagramHref: string;
  email: string;
  emailHref: string;
}

export interface PaymentCheckoutPolicy {
  contact: PaymentContactInfo;
  methods: PaymentMethodOption[];
  referenceLabel: string;
  referencePlaceholder: string;
  referenceRequired: boolean;
  proofsLabel: string;
  proofsHint: string;
  maxProofFiles: number;
  showOptionalNote: boolean;
  optionalNoteLabel: string;
  optionalNotePlaceholder: string;
}

export const DEFAULT_PAYMENT_CHECKOUT_POLICY: PaymentCheckoutPolicy = {
  contact: {
    phone: "+(54) 9 11 3819 2675",
    phoneHref: "tel:+5491138192675",
    instagram: "@anttova_fitness",
    instagramHref: "https://instagram.com/anttova_fitness",
    email: "ma.lanzahuerta@gmail.com",
    emailHref: "mailto:ma.lanzahuerta@gmail.com",
  },
  methods: [
    {
      id: "zelle",
      label: "Zelle",
      detail: "Mariantolanza00@gmail.com",
    },
    {
      id: "mercado_pago",
      label: "Mercado Pago",
      detail: "Anttova",
    },
  ],
  referenceLabel: "Número de referencia / comprobante",
  referencePlaceholder: "Ej. 1234567890 o ID de operación",
  referenceRequired: true,
  proofsLabel: "Captura del pago",
  proofsHint:
    "Sube una captura de pantalla del comprobante (JPG, PNG o WebP).",
  maxProofFiles: 1,
  showOptionalNote: true,
  optionalNoteLabel: "Nota adicional (opcional)",
  optionalNotePlaceholder: "Ej. titular de la cuenta, horario del pago",
};
