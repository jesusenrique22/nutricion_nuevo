import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

/** Campos de Payment existentes antes de la migración de saldo paciente. */
export const paymentSelectLegacy = {
  id: true,
  appointmentId: true,
  amount: true,
  advanceAmount: true,
  remainderAmount: true,
  advancePercent: true,
  currency: true,
  status: true,
  advanceStatus: true,
  remainderStatus: true,
  provider: true,
  providerRef: true,
  adminNote: true,
  advanceNote: true,
  remainderNote: true,
  patientPaymentMethod: true,
  patientPaymentReference: true,
  patientPaymentNote: true,
  patientPaymentProofUrls: true,
  paidAt: true,
  advancePaidAt: true,
  remainderPaidAt: true,
  refundStatus: true,
  refundRequestedAt: true,
  refundPatientNote: true,
  refundAdminNote: true,
  refundResolvedAt: true,
  advanceInboxTrashedAt: true,
  remainderInboxTrashedAt: true,
  advanceInboxDismissedAt: true,
  remainderInboxDismissedAt: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

/** Incluye comprobante de saldo enviado por el paciente. */
export const paymentSelectFull = {
  ...paymentSelectLegacy,
  remainderPatientPaymentMethod: true,
  remainderPatientPaymentReference: true,
  remainderPatientPaymentNote: true,
  remainderPatientPaymentProofUrls: true,
  remainderSubmittedAt: true,
} satisfies Prisma.PaymentSelect;

function isMissingColumnError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const msg = err instanceof Error ? err.message : String(err);
  return code === "P2022" || msg.includes("does not exist in the current database");
}

let cachedPaymentSelect: Prisma.PaymentSelect | null = null;

/** Select compatible con la DB actual (con o sin migración de saldo). */
export async function getPaymentQuerySelect(): Promise<Prisma.PaymentSelect> {
  if (cachedPaymentSelect) return cachedPaymentSelect;

  try {
    await prisma.payment.findFirst({ select: paymentSelectFull });
    cachedPaymentSelect = paymentSelectFull;
  } catch (err) {
    if (isMissingColumnError(err)) {
      cachedPaymentSelect = paymentSelectLegacy;
    } else {
      throw err;
    }
  }

  return cachedPaymentSelect;
}

export function resetPaymentQuerySelectCache(): void {
  cachedPaymentSelect = null;
}

/** True cuando la migración de comprobante de saldo ya está aplicada. */
export async function hasPaymentRemainderColumns(): Promise<boolean> {
  const select = await getPaymentQuerySelect();
  return "remainderSubmittedAt" in select;
}
