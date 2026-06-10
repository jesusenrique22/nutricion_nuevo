import { prisma } from "@/server/db/prisma";
import { consultationChatLabel } from "@/lib/consultation-chat";
import { getPaymentChatPolicy } from "@/lib/payment-chat-policy";
import { toPaymentPhaseView } from "@/lib/payment-split";
import type { ConsultationChatCode } from "@/types/chat";
import type {
  ChatTypeEligibility,
  ChatUnlockReason,
} from "@/types/payment-chat-policy";
import { CONSULTATION_CHAT_CODES } from "@/lib/consultation-chat";

const ACTIVE_APPOINTMENT_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED"] as const;

function lockedHint(code: ConsultationChatCode): string {
  const label = consultationChatLabel(code);
  return `Agenda una cita de ${label} o registra el adelanto para desbloquear este chat.`;
}

function reasonHint(reason: ChatUnlockReason, code: ConsultationChatCode): string {
  const label = consultationChatLabel(code);
  switch (reason) {
    case "appointment":
      return `Chat activo por cita de ${label} agendada.`;
    case "advance_paid":
      return `Chat activo por adelanto registrado (${label}).`;
    case "remainder_paid":
      return `Chat activo por pago final registrado (${label}).`;
    case "fully_paid":
      return `Chat activo por pago completo (${label}).`;
    default:
      return lockedHint(code);
  }
}

export async function getPatientChatEligibility(
  patientId: string,
): Promise<Record<ConsultationChatCode, ChatTypeEligibility>> {
  const policy = await getPaymentChatPolicy();

  const appointments = await prisma.appointment.findMany({
    where: {
      patientId,
      status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
    },
    include: {
      consultationType: { select: { code: true } },
      payment: true,
    },
    orderBy: { startTime: "desc" },
  });

  const byCode: Record<
    ConsultationChatCode,
    {
      hasAppointment: boolean;
      advancePaid: boolean;
      remainderPaid: boolean;
      fullyPaid: boolean;
    }
  > = {
    NUT_01: {
      hasAppointment: false,
      advancePaid: false,
      remainderPaid: false,
      fullyPaid: false,
    },
    ENT_02: {
      hasAppointment: false,
      advancePaid: false,
      remainderPaid: false,
      fullyPaid: false,
    },
    ANT_03: {
      hasAppointment: false,
      advancePaid: false,
      remainderPaid: false,
      fullyPaid: false,
    },
  };

  for (const appt of appointments) {
    const code = appt.consultationType.code as ConsultationChatCode;
    if (!CONSULTATION_CHAT_CODES.includes(code)) continue;

    byCode[code].hasAppointment = true;

    if (!appt.payment) continue;
    const view = toPaymentPhaseView(appt.payment);

    if (view.advanceStatus === "PAID") byCode[code].advancePaid = true;
    if (view.remainderStatus === "PAID") byCode[code].remainderPaid = true;
    if (view.overallStatus === "PAID" || appt.payment.status === "PAID") {
      byCode[code].fullyPaid = true;
    }
  }

  const result = {} as Record<ConsultationChatCode, ChatTypeEligibility>;

  for (const code of CONSULTATION_CHAT_CODES) {
    const state = byCode[code];
    let enabled = false;
    let reason: ChatUnlockReason = "locked";

    if (policy.chatUnlockOnAppointment && state.hasAppointment) {
      enabled = true;
      reason = "appointment";
    } else if (policy.chatUnlockOnAdvancePaid && state.advancePaid) {
      enabled = true;
      reason = "advance_paid";
    } else if (policy.chatUnlockOnRemainderPaid && state.remainderPaid) {
      enabled = true;
      reason = "remainder_paid";
    } else if (state.fullyPaid) {
      enabled = true;
      reason = "fully_paid";
    }

    result[code] = {
      enabled,
      reason,
      unlockHint: enabled ? reasonHint(reason, code) : lockedHint(code),
    };
  }

  return result;
}

export async function isPatientChatEnabled(
  patientId: string,
  consultationCode: ConsultationChatCode,
): Promise<ChatTypeEligibility> {
  const map = await getPatientChatEligibility(patientId);
  return map[consultationCode];
}
