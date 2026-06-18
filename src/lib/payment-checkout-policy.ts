import {
  DEFAULT_PAYMENT_CHECKOUT_POLICY,
  PAYMENT_CHECKOUT_POLICY_SLUG,
  type PaymentCheckoutPolicy,
  type PaymentContactInfo,
  type PaymentMethodId,
  type PaymentMethodOption,
} from "@/types/payment-checkout-policy";
import { getSiteContentBySlug } from "@/server/actions/cms.actions";

const METHOD_IDS = new Set<PaymentMethodId>(["zelle", "mercado_pago"]);

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseContact(data: unknown): PaymentContactInfo {
  const d =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  const fb = DEFAULT_PAYMENT_CHECKOUT_POLICY.contact;
  return {
    phone: str(d.phone, fb.phone),
    phoneHref: str(d.phoneHref, fb.phoneHref),
    instagram: str(d.instagram, fb.instagram),
    instagramHref: str(d.instagramHref, fb.instagramHref),
    email: str(d.email, fb.email),
    emailHref: str(d.emailHref, fb.emailHref),
  };
}

function parseMethods(data: unknown): PaymentMethodOption[] {
  if (!Array.isArray(data)) return DEFAULT_PAYMENT_CHECKOUT_POLICY.methods;
  const parsed = data
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const id = r.id as PaymentMethodId;
      if (!METHOD_IDS.has(id)) return null;
      return {
        id,
        label: str(r.label, id),
        detail: str(r.detail, ""),
      };
    })
    .filter((m): m is PaymentMethodOption => m != null);
  return parsed.length > 0 ? parsed : DEFAULT_PAYMENT_CHECKOUT_POLICY.methods;
}

export function parsePaymentCheckoutPolicy(
  data: Record<string, unknown> | null | undefined,
): PaymentCheckoutPolicy {
  if (!data) return DEFAULT_PAYMENT_CHECKOUT_POLICY;
  const fb = DEFAULT_PAYMENT_CHECKOUT_POLICY;
  return {
    contact: parseContact(data.contact),
    methods: parseMethods(data.methods),
    referenceLabel: str(data.referenceLabel, fb.referenceLabel),
    referencePlaceholder: str(
      data.referencePlaceholder,
      fb.referencePlaceholder,
    ),
    referenceRequired: bool(data.referenceRequired, fb.referenceRequired),
    proofsLabel: str(data.proofsLabel, fb.proofsLabel),
    proofsHint: str(data.proofsHint, fb.proofsHint),
    maxProofFiles: clampInt(data.maxProofFiles, 1, 1, fb.maxProofFiles),
    showOptionalNote: bool(data.showOptionalNote, fb.showOptionalNote),
    optionalNoteLabel: str(data.optionalNoteLabel, fb.optionalNoteLabel),
    optionalNotePlaceholder: str(
      data.optionalNotePlaceholder,
      fb.optionalNotePlaceholder,
    ),
  };
}

export async function getPaymentCheckoutPolicy(): Promise<PaymentCheckoutPolicy> {
  const row = await getSiteContentBySlug(PAYMENT_CHECKOUT_POLICY_SLUG);
  return parsePaymentCheckoutPolicy(
    row?.data as Record<string, unknown> | undefined,
  );
}

export function paymentCheckoutPolicyToRecord(
  policy: PaymentCheckoutPolicy,
): Record<string, unknown> {
  return { ...policy };
}

export function parseProofUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((u): u is string => typeof u === "string" && u.length > 0);
}
