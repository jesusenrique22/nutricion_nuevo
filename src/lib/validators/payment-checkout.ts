import { z } from "zod";

const paymentMethodSchema = z.object({
  id: z.enum(["zelle", "mercado_pago"]),
  label: z.string().min(1).max(120),
  detail: z.string().max(500),
});

const contactSchema = z.object({
  phone: z.string().min(3).max(40),
  phoneHref: z.string().min(3).max(80),
  instagram: z.string().min(1).max(80),
  instagramHref: z.string().url().max(200),
  email: z.string().email().max(120),
  emailHref: z.string().min(3).max(120),
});

export const paymentCheckoutPolicySchema = z.object({
  contact: contactSchema,
  methods: z.array(paymentMethodSchema).min(1).max(6),
  referenceLabel: z.string().min(1).max(120),
  referencePlaceholder: z.string().max(200),
  referenceRequired: z.boolean(),
  proofsLabel: z.string().min(1).max(120),
  proofsHint: z.string().max(400),
  maxProofFiles: z.number().int().min(1).max(1),
  showOptionalNote: z.boolean(),
  optionalNoteLabel: z.string().min(1).max(120),
  optionalNotePlaceholder: z.string().max(200),
});
