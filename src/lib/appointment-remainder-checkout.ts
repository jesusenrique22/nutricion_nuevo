import { buildAppointmentPaymentPlan } from "@/lib/appointment-remainder";
import { isTwoPhaseSplit } from "@/lib/payment-policy-resolve";
import { getPaymentQuerySelect } from "@/lib/payment-query-select";
import { toPaymentPhaseView } from "@/lib/payment-split";
import { prisma } from "@/server/db/prisma";
import { notifyRemainderPaymentSubmitted } from "@/server/services/appointment-notify.service";

export type RemainderPaymentPayload = {
  patientPaymentMethod: string;
  patientPaymentReference: string | null;
  patientPaymentNote: string | null;
  patientPaymentProofUrls: string[];
};

export async function validateRemainderCartPayment(params: {
  patientId: string;
  appointmentId: string;
}): Promise<
  | {
      ok: true;
      paymentId: string;
      remainderAmount: string;
      consultationName: string;
      startTime: Date;
    }
  | { ok: false; message: string }
> {
  const paymentSelect = await getPaymentQuerySelect();
  const appt = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    include: {
      consultationType: true,
      payment: { select: paymentSelect },
    },
  });

  if (!appt || appt.patientId !== params.patientId) {
    return { ok: false, message: "Cita no encontrada." };
  }

  if (!appt.payment) {
    return { ok: false, message: "No hay registro de pago para esta cita." };
  }

  if (["CANCELLED", "NO_SHOW"].includes(appt.status)) {
    return { ok: false, message: "Esta cita ya no admite pagos." };
  }

  const phases = toPaymentPhaseView(appt.payment);
  if (!isTwoPhaseSplit(phases.advancePercent)) {
    return { ok: false, message: "Esta cita no tiene saldo pendiente." };
  }

  const remainderSubmittedAt =
    "remainderSubmittedAt" in appt.payment
      ? (appt.payment.remainderSubmittedAt as Date | null | undefined)
      : null;

  const plan = buildAppointmentPaymentPlan({
    phases,
    totalAmount: appt.payment.amount.toString(),
    dueAt: appt.startTime,
    endAt: appt.endTime,
    remainderSubmittedAt,
  });

  if (!plan?.canPayRemainder) {
    return {
      ok: false,
      message:
        plan?.remainderLockedMessage ??
        "El saldo de esta cita aún no está habilitado para pagar.",
    };
  }

  return {
    ok: true,
    paymentId: appt.payment.id,
    remainderAmount: phases.remainderAmount,
    consultationName: appt.consultationType.name,
    startTime: appt.startTime,
  };
}

export async function applyRemainderCartPayment(params: {
  patientId: string;
  patientName: string;
  appointmentId: string;
  payload: RemainderPaymentPayload;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const check = await validateRemainderCartPayment({
    patientId: params.patientId,
    appointmentId: params.appointmentId,
  });
  if (!check.ok) return check;

  const proofs = params.payload.patientPaymentProofUrls ?? [];
  if (proofs.length === 0) {
    return { ok: false, message: "Adjuntá el comprobante de pago." };
  }

  const now = new Date();

  await prisma.payment.update({
    where: { id: check.paymentId },
    data: {
      remainderPatientPaymentMethod: params.payload.patientPaymentMethod.trim(),
      remainderPatientPaymentReference:
        params.payload.patientPaymentReference?.trim() ?? null,
      remainderPatientPaymentNote: params.payload.patientPaymentNote?.trim() ?? null,
      remainderPatientPaymentProofUrls: proofs,
      remainderSubmittedAt: now,
      remainderInboxTrashedAt: null,
    },
  });

  await notifyRemainderPaymentSubmitted({
    patientId: params.patientId,
    patientName: params.patientName,
    consultationName: check.consultationName,
    appointmentId: params.appointmentId,
    amount: check.remainderAmount,
    dueAt: check.startTime,
  });

  return { ok: true };
}
