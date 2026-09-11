import { dateKeyInClinicTz, minutesInClinicTz } from "@/lib/clinic-timezone";
import { isTwoPhaseSplit } from "@/lib/payment-policy-resolve";
import type { PaymentPhaseView } from "@/lib/payment-split";

export type RemainderUrgency = "relaxed" | "soon" | "urgent" | "overdue";

/** Etapa visible del plan en 2 cuotas. */
export type PaymentPlanStage =
  | "awaiting_advance"
  | "remainder_scheduled"
  | "remainder_payable"
  | "remainder_in_review"
  | "complete";

export interface AppointmentPaymentPlan {
  stage: PaymentPlanStage;
  advanceAmount: string;
  remainderAmount: string;
  totalAmount: string;
  advancePercent: number;
  dueAt: string;
  endAt: string;
  daysUntilDue: number;
  urgency: RemainderUrgency;
  /** El paciente puede agregar el saldo al carrito ahora. */
  canPayRemainder: boolean;
  /** Mensaje cuando el saldo aún no está habilitado. */
  remainderLockedMessage: string | null;
  advanceStatus: string;
  remainderStatus: string;
}

const MS_DAY = 86_400_000;

export function getRemainderUrgency(dueAt: Date, now = new Date()): RemainderUrgency {
  const days = (dueAt.getTime() - now.getTime()) / MS_DAY;
  if (days < 0) return "overdue";
  if (days <= 1) return "urgent";
  if (days <= 3) return "soon";
  return "relaxed";
}

export function daysUntilDue(dueAt: Date, now = new Date()): number {
  return Math.ceil((dueAt.getTime() - now.getTime()) / MS_DAY);
}

/** Saldo habilitado el día de la cita, entre hora de inicio y fin (zona clínica). */
export function isRemainderPaymentWindowOpen(
  startTime: Date,
  endTime: Date,
  now = new Date(),
): boolean {
  if (dateKeyInClinicTz(now) !== dateKeyInClinicTz(startTime)) {
    return false;
  }
  const nowMin = minutesInClinicTz(now);
  const startMin = minutesInClinicTz(startTime);
  const endMin = minutesInClinicTz(endTime);
  return nowMin >= startMin && nowMin <= endMin;
}

export function remainderPaymentWindowLabel(
  startTime: Date,
  endTime: Date,
  now = new Date(),
): string {
  const startLabel = startTime.toLocaleString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const endLabel = endTime.toLocaleString("es", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  if (dateKeyInClinicTz(now) !== dateKeyInClinicTz(startTime)) {
    return `Podrás pagar el saldo el día de tu cita (${startLabel})`;
  }

  if (minutesInClinicTz(now) < minutesInClinicTz(startTime)) {
    return `El saldo se habilita hoy a las ${startTime.toLocaleString("es", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    })}`;
  }

  if (minutesInClinicTz(now) > minutesInClinicTz(endTime)) {
    return "Pasó el horario de la cita — contactá a Anttova para regularizar el saldo";
  }

  return `Saldo habilitado hasta las ${endLabel} (horario de tu cita)`;
}

export function remainderDueLabel(dueAt: Date, now = new Date()): string {
  const days = daysUntilDue(dueAt, now);
  if (days < 0) {
    return "Consulta pasada — saldo pendiente";
  }
  if (days === 0) {
    return "Hoy es el día de tu consulta";
  }
  if (days === 1) {
    return "Mañana es tu consulta";
  }
  return `Faltan ${days} días para tu consulta`;
}

/** Plan de pago en 2 cuotas para mostrar al paciente. */
export function buildAppointmentPaymentPlan(params: {
  phases: PaymentPhaseView;
  totalAmount: string;
  dueAt: Date;
  endAt: Date;
  remainderSubmittedAt: Date | null | undefined;
  now?: Date;
}): AppointmentPaymentPlan | null {
  const { phases, totalAmount, dueAt, endAt, remainderSubmittedAt } = params;
  const now = params.now ?? new Date();

  if (!isTwoPhaseSplit(phases.advancePercent)) return null;
  if (Number(phases.remainderAmount) <= 0) return null;

  const days = daysUntilDue(dueAt, now);
  const urgency = getRemainderUrgency(dueAt, now);
  const windowOpen = isRemainderPaymentWindowOpen(dueAt, endAt, now);
  const lockedMessage = remainderPaymentWindowLabel(dueAt, endAt, now);

  const base = {
    advanceAmount: phases.advanceAmount,
    remainderAmount: phases.remainderAmount,
    totalAmount,
    advancePercent: phases.advancePercent,
    dueAt: dueAt.toISOString(),
    endAt: endAt.toISOString(),
    daysUntilDue: days,
    urgency,
    advanceStatus: phases.advanceStatus,
    remainderStatus: phases.remainderStatus,
    remainderLockedMessage: lockedMessage,
  };

  if (phases.remainderStatus === "PAID") {
    return { ...base, stage: "complete", canPayRemainder: false };
  }

  if (phases.advanceStatus !== "PAID") {
    return {
      ...base,
      stage: "awaiting_advance",
      canPayRemainder: false,
    };
  }

  if (remainderSubmittedAt) {
    return {
      ...base,
      stage: "remainder_in_review",
      canPayRemainder: false,
    };
  }

  if (windowOpen) {
    return {
      ...base,
      stage: "remainder_payable",
      canPayRemainder: true,
    };
  }

  return {
    ...base,
    stage: "remainder_scheduled",
    canPayRemainder: false,
  };
}

/** Citas con plan activo (no canceladas y saldo no cerrado). */
export function isActivePaymentPlan(
  plan: AppointmentPaymentPlan | null | undefined,
  appointmentStatus: string,
): plan is AppointmentPaymentPlan {
  if (!plan) return false;
  if (appointmentStatus === "CANCELLED") return false;
  return plan.stage !== "complete";
}
