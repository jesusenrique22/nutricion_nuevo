"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPaymentQuerySelect } from "@/lib/payment-query-select";
import { prisma } from "@/server/db/prisma";
import {
  cancelAppointmentSchema,
  changeAppointmentServiceSchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
} from "@/lib/validators/appointment-status";
import { syncPatientAndAdmins } from "@/server/realtime/sync";
import {
  notifyAppointmentStatusChange,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
} from "@/server/services/appointment-notify.service";
import { notifyReviewRequested } from "@/server/services/review-notify.service";
import { formatActionError } from "@/lib/db-errors";
import { Prisma } from "@prisma/client";
import type { ConsultationCode } from "@/lib/consultation-codes";
import { getPaymentChatPolicy } from "@/lib/payment-chat-policy";
import { buildPaymentCreateData } from "@/lib/payment-split";
import { validateAppointmentSlot } from "@/server/services/scheduling.service";
import {
  cancelAppointmentPaymentRequest,
  removeCartItemsForAppointment,
} from "@/server/services/appointment-cancel-payment.service";

async function refreshGoogleCalendar(appointmentId: string) {
  const { refreshAppointmentGoogleCalendar } = await import(
    "@/server/services/google-calendar-sync.service"
  );
  await refreshAppointmentGoogleCalendar(appointmentId);
}

export type StatusActionResult =
  | { ok: true }
  | { ok: false; message: string };

const MIN_CANCEL_HOURS = 2;
const MIN_RESCHEDULE_HOURS = 2;

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW", "PENDING"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: ["COMPLETED"],
};

async function revalidateAppointmentPaths(patientId: string) {
  revalidatePath("/dashboard/admin/calendar");
  revalidatePath("/dashboard/admin/patients");
  revalidatePath(`/dashboard/admin/patients/${patientId}`);
  revalidatePath("/dashboard/patient/appointments");
  revalidatePath("/dashboard/patient/cart");
  revalidatePath("/dashboard/patient/cart/historial");
  revalidatePath("/dashboard/admin/payments");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
  await syncPatientAndAdmins(patientId, "appointments");
}

/**
 * Cancelar la cita y dejar el cobro vivo es la mitad del trabajo: anula lo que
 * quede por cobrar y limpia el carrito antes de avisarle a nadie.
 */
async function voidPaymentForCancelledAppointment(appt: {
  id: string;
  patientId: string;
  consultationTypeId: string;
  startTime: Date;
}) {
  try {
    await cancelAppointmentPaymentRequest(appt.id);
    await removeCartItemsForAppointment({
      appointmentId: appt.id,
      patientId: appt.patientId,
      consultationTypeId: appt.consultationTypeId,
      startTime: appt.startTime,
    });
  } catch (err) {
    // La cita ya quedó cancelada; no revertirla por esto, pero sí registrarlo.
    console.error("[appointment-cancel/payment]", appt.id, err);
  }
}

async function loadAppointment(appointmentId: string) {
  const paymentSelect = await getPaymentQuerySelect();
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      consultationType: true,
      payment: { select: paymentSelect },
      patient: true,
    },
  });
}

export async function updateAppointmentStatus(
  formData: unknown,
): Promise<StatusActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }

    const parsed = updateAppointmentStatusSchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    const appt = await loadAppointment(parsed.data.appointmentId);
    if (!appt) return { ok: false, message: "Cita no encontrada." };

    const allowed = ADMIN_TRANSITIONS[appt.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return {
        ok: false,
        message: `No puedes cambiar de ${appt.status} a ${parsed.data.status}.`,
      };
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: parsed.data.status,
        notes: parsed.data.notes ?? appt.notes,
        ...(parsed.data.status === "CANCELLED"
          ? {
              cancelledBy: "ADMIN",
              cancelledAt: new Date(),
            }
          : {}),
      },
    });

    if (parsed.data.status === "CONFIRMED") {
      await notifyAppointmentStatusChange({
        patientId: appt.patientId,
        consultationName: appt.consultationType.name,
        startTime: appt.startTime,
        status: parsed.data.status,
        appointmentId: appt.id,
      });
    }

    if (parsed.data.status === "CANCELLED") {
      await voidPaymentForCancelledAppointment(appt);
      await notifyAppointmentCancelled({
        appointmentId: appt.id,
        patientId: appt.patientId,
        patientName: appt.patient.name,
        consultationName: appt.consultationType.name,
        startTime: appt.startTime,
        cancelledBy: "ADMIN",
      });
      await refreshGoogleCalendar(appt.id);
    } else if (parsed.data.status === "COMPLETED") {
      await notifyReviewRequested({
        patientId: appt.patientId,
        itemTitle: appt.consultationType.name,
        itemKind: "APPOINTMENT",
        entityId: appt.id,
      });
      await refreshGoogleCalendar(appt.id);
    } else {
      await refreshGoogleCalendar(appt.id);
    }

    await revalidateAppointmentPaths(appt.patientId);
    return { ok: true };
  } catch (err) {
    console.error("[updateAppointmentStatus]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo actualizar la cita."),
    };
  }
}

export async function cancelAppointment(
  formData: unknown,
): Promise<StatusActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "Debes iniciar sesión." };

    const parsed = cancelAppointmentSchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    const appt = await loadAppointment(parsed.data.appointmentId);
    if (!appt) return { ok: false, message: "Cita no encontrada." };

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = appt.patientId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { ok: false, message: "No autorizado." };
    }

    if (!["PENDING", "CONFIRMED"].includes(appt.status)) {
      return { ok: false, message: "Esta cita ya no se puede cancelar." };
    }

    if (appt.startTime <= new Date()) {
      return { ok: false, message: "No puedes cancelar una cita pasada." };
    }

    if (!isAdmin) {
      const hoursUntil =
        (appt.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil < MIN_CANCEL_HOURS) {
        return {
          ok: false,
          message: `Solo puedes cancelar con al menos ${MIN_CANCEL_HOURS} horas de anticipación.`,
        };
      }
    }

    const cancelledBy = isAdmin ? ("ADMIN" as const) : ("PATIENT" as const);

    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: "CANCELLED",
        cancelledBy,
        cancelledAt: new Date(),
      },
    });

    await voidPaymentForCancelledAppointment(appt);

    await notifyAppointmentCancelled({
      appointmentId: appt.id,
      patientId: appt.patientId,
      patientName: appt.patient.name,
      consultationName: appt.consultationType.name,
      startTime: appt.startTime,
      cancelledBy,
    });

    await refreshGoogleCalendar(appt.id);

    await revalidateAppointmentPaths(appt.patientId);
    return { ok: true };
  } catch (err) {
    console.error("[cancelAppointment]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo cancelar la cita."),
    };
  }
}

export async function rescheduleAppointment(
  formData: unknown,
): Promise<StatusActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "Debes iniciar sesión." };

    const parsed = rescheduleAppointmentSchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    const appt = await loadAppointment(parsed.data.appointmentId);
    if (!appt) return { ok: false, message: "Cita no encontrada." };

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = appt.patientId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { ok: false, message: "No autorizado." };
    }

    if (!["PENDING", "CONFIRMED"].includes(appt.status)) {
      return { ok: false, message: "Esta cita ya no se puede reagendar." };
    }

    if (appt.startTime <= new Date()) {
      return { ok: false, message: "No puedes reagendar una cita pasada." };
    }

    if (!isAdmin) {
      const hoursUntil =
        (appt.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil < MIN_RESCHEDULE_HOURS) {
        return {
          ok: false,
          message: `Solo puedes reagendar con al menos ${MIN_RESCHEDULE_HOURS} horas de anticipación.`,
        };
      }
    }

    const startTime = new Date(parsed.data.startTime);
    if (startTime <= new Date()) {
      return { ok: false, message: "El nuevo horario debe ser en el futuro." };
    }

    const validation = await validateAppointmentSlot({
      consultationType: appt.consultationType,
      startTime,
      modality: appt.modality,
      excludeAppointmentId: appt.id,
    });

    if (!validation.ok) {
      return { ok: false, message: validation.message };
    }

    const rescheduledBy = isAdmin ? ("ADMIN" as const) : ("PATIENT" as const);

    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        startTime,
        endTime: validation.endTime,
        reminderSentAt: null,
      },
    });

    // Primero Google Calendar: que un correo lento o fallido no lo bloquee.
    await refreshGoogleCalendar(appt.id);

    await notifyAppointmentRescheduled({
      patientId: appt.patientId,
      patientName: appt.patient.name,
      patientEmail: appt.patient.email,
      consultationName: appt.consultationType.name,
      newStartTime: startTime,
      appointmentId: appt.id,
      rescheduledBy,
    });

    await revalidateAppointmentPaths(appt.patientId);
    return { ok: true };
  } catch (err) {
    console.error("[rescheduleAppointment]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo reagendar la cita."),
    };
  }
}

/**
 * Corrige el servicio de una cita (ej. se agendó un pack en vez de una
 * consulta) sin cancelarla: cancelar y volver a agendar dejaba dos cobros y
 * le llegaban al paciente avisos de más. Lo ya cobrado se respeta.
 */
export async function changeAppointmentService(
  formData: unknown,
): Promise<StatusActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }

    const parsed = changeAppointmentServiceSchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    const appt = await loadAppointment(parsed.data.appointmentId);
    if (!appt) return { ok: false, message: "Cita no encontrada." };

    if (!["PENDING", "CONFIRMED"].includes(appt.status)) {
      return { ok: false, message: "A esta cita ya no se le puede cambiar el servicio." };
    }
    if (appt.consultationTypeId === parsed.data.consultationTypeId) {
      return { ok: false, message: "La cita ya tiene ese servicio." };
    }

    const newType = await prisma.consultationType.findUnique({
      where: { id: parsed.data.consultationTypeId },
    });
    if (!newType) return { ok: false, message: "Servicio no encontrado." };

    const validation = await validateAppointmentSlot({
      consultationType: newType,
      startTime: appt.startTime,
      modality: appt.modality,
      excludeAppointmentId: appt.id,
    });
    if (!validation.ok) {
      return {
        ok: false,
        message: `${validation.message} Reagendá primero a un horario libre para este servicio.`,
      };
    }

    const payment = appt.payment;
    const advancePaid = payment?.advanceStatus === "PAID";
    const remainderPaid = payment?.remainderStatus === "PAID";
    if (payment && (payment.status === "PAID" || remainderPaid)) {
      return {
        ok: false,
        message: "La cita ya está pagada completa: no se puede cambiar el servicio.",
      };
    }

    // Se conserva el descuento de cupón que tuviera el cobro original.
    const discountAmount = payment
      ? Prisma.Decimal.max(0, appt.consultationType.price.sub(payment.amount))
      : new Prisma.Decimal(0);
    const policy = await getPaymentChatPolicy();
    const fresh = buildPaymentCreateData({
      totalPrice: newType.price,
      consultationCode: newType.code as ConsultationCode,
      policy,
      discountAmount,
    });

    let paymentData: Prisma.PaymentUncheckedUpdateInput | null = null;
    if (payment && advancePaid) {
      // Adelanto ya cobrado: se mantiene y se ajusta solo el saldo.
      const remainder = fresh.amount.sub(payment.advanceAmount);
      if (remainder.lt(0)) {
        return {
          ok: false,
          message:
            "El adelanto ya pagado supera el precio del nuevo servicio. Registrá la diferencia como reembolso.",
        };
      }
      const settled = remainder.eq(0);
      paymentData = {
        amount: fresh.amount,
        remainderAmount: remainder,
        remainderStatus: settled ? "PAID" : "PENDING",
        status: settled ? "PAID" : payment.status,
        ...(settled ? { paidAt: new Date(), remainderPaidAt: new Date() } : {}),
      };
    } else if (payment) {
      paymentData = {
        amount: fresh.amount,
        advanceAmount: fresh.advanceAmount,
        remainderAmount: fresh.remainderAmount,
        advancePercent: fresh.advancePercent,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appt.id },
        data: {
          consultationTypeId: newType.id,
          endTime: validation.endTime,
        },
      });
      if (paymentData && payment) {
        await tx.payment.update({ where: { id: payment.id }, data: paymentData });
      } else if (!payment) {
        await tx.payment.create({ data: { appointmentId: appt.id, ...fresh } });
      }
    });

    await refreshGoogleCalendar(appt.id);
    await revalidateAppointmentPaths(appt.patientId);
    return { ok: true };
  } catch (err) {
    console.error("[changeAppointmentService]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo cambiar el servicio."),
    };
  }
}
