import { Prisma } from "@prisma/client";
import type { ConsultationCode } from "@/lib/consultation-codes";
import type { PaymentChatPolicy } from "@/types/payment-chat-policy";
import { resolvePaymentSplit } from "@/lib/payment-policy-resolve";

export function splitPaymentAmount(
  total: Prisma.Decimal | number | string,
  advancePercent: number,
): { advanceAmount: Prisma.Decimal; remainderAmount: Prisma.Decimal } {
  const totalDec =
    total instanceof Prisma.Decimal ? total : new Prisma.Decimal(total);
  const pct = Math.min(100, Math.max(0, Math.round(advancePercent)));
  const advanceAmount = totalDec
    .mul(pct)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const remainderAmount = totalDec.sub(advanceAmount).toDecimalPlaces(2);
  return { advanceAmount, remainderAmount };
}

export function syncOverallPaymentStatus(
  advanceStatus: string,
  remainderStatus: string,
): "PENDING" | "PARTIAL" | "PAID" | "REFUNDED" {
  if (advanceStatus === "REFUNDED" || remainderStatus === "REFUNDED") {
    return "REFUNDED";
  }
  const advancePaid = advanceStatus === "PAID";
  const remainderPaid = remainderStatus === "PAID";
  if (advancePaid && remainderPaid) return "PAID";
  if (advancePaid || remainderPaid) return "PARTIAL";
  return "PENDING";
}

export function buildPaymentCreateData(params: {
  totalPrice: Prisma.Decimal;
  consultationCode: ConsultationCode;
  policy: PaymentChatPolicy;
}) {
  const split = resolvePaymentSplit(params.policy, params.consultationCode);
  const { advanceAmount, remainderAmount } = splitPaymentAmount(
    params.totalPrice,
    split.advancePercent,
  );

  return {
    amount: params.totalPrice,
    advanceAmount,
    remainderAmount,
    advancePercent: split.advancePercent,
    status: "PENDING" as const,
    advanceStatus: "PENDING" as const,
    remainderStatus: "PENDING" as const,
    provider: "manual",
  };
}

export type PaymentPhaseView = {
  advanceAmount: string;
  remainderAmount: string;
  advancePercent: number;
  advanceStatus: string;
  remainderStatus: string;
  overallStatus: string;
};

export function toPaymentPhaseView(payment: {
  amount: Prisma.Decimal;
  advanceAmount: Prisma.Decimal;
  remainderAmount: Prisma.Decimal;
  advancePercent: number;
  status: string;
  advanceStatus: string;
  remainderStatus: string;
}): PaymentPhaseView {
  const hasSplit =
    payment.advanceAmount.greaterThan(0) ||
    payment.remainderAmount.greaterThan(0);

  let advanceAmount = payment.advanceAmount;
  let remainderAmount = payment.remainderAmount;

  if (!hasSplit) {
    const split = splitPaymentAmount(payment.amount, payment.advancePercent);
    advanceAmount = split.advanceAmount;
    remainderAmount = split.remainderAmount;
  }

  let advanceStatus = payment.advanceStatus;
  let remainderStatus = payment.remainderStatus;

  if (payment.status === "PAID" && advanceStatus === "PENDING") {
    advanceStatus = "PAID";
    remainderStatus = "PAID";
  }

  return {
    advanceAmount: advanceAmount.toString(),
    remainderAmount: remainderAmount.toString(),
    advancePercent: payment.advancePercent,
    advanceStatus,
    remainderStatus,
    overallStatus: syncOverallPaymentStatus(advanceStatus, remainderStatus),
  };
}
