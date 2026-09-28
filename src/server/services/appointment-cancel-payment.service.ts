/**
 * Anulación del cobro cuando se cancela una cita.
 *
 * Cancelar la cita sin tocar el Payment dejaba la solicitud de cobro viva: al
 * paciente le seguía figurando el pago pendiente en su historial y a Anttova en
 * la bandeja de cobros, aunque la cita ya no existiera.
 */
import { prisma } from "@/server/db/prisma";

export type CancelPaymentOutcome = {
  /** Se anuló la solicitud completa: no quedaba nada cobrado. */
  voided: boolean;
  /** Había dinero cobrado; queda para el circuito de reembolso. */
  keptPaidAmount: boolean;
};

const NOTHING_TO_DO: CancelPaymentOutcome = {
  voided: false,
  keptPaidAmount: false,
};

/**
 * Anula lo que quede por cobrar de una cita y la saca de las bandejas de
 * pendientes. Lo ya pagado no se toca: eso se resuelve por reembolso, que tiene
 * su propio circuito.
 */
export async function cancelAppointmentPaymentRequest(
  appointmentId: string,
): Promise<CancelPaymentOutcome> {
  const payment = await prisma.payment.findUnique({
    where: { appointmentId },
    select: {
      id: true,
      status: true,
      advanceStatus: true,
      remainderStatus: true,
    },
  });
  if (!payment) return NOTHING_TO_DO;

  const advancePaid = payment.advanceStatus === "PAID";
  const remainderPaid = payment.remainderStatus === "PAID";
  const alreadyClosed =
    payment.status === "REFUNDED" || payment.status === "CANCELLED";

  if (alreadyClosed) return NOTHING_TO_DO;

  const now = new Date();
  // Solo las fases sin cobrar pasan a CANCELLED; las cobradas conservan su
  // estado para que el reembolso siga teniendo de dónde partir.
  const advanceStatus = advancePaid ? payment.advanceStatus : "CANCELLED";
  const remainderStatus = remainderPaid
    ? payment.remainderStatus
    : "CANCELLED";
  const keptPaidAmount = advancePaid || remainderPaid;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      advanceStatus,
      remainderStatus,
      // Con algo cobrado el total sigue siendo PARTIAL/PAID: decir "cancelado"
      // escondería plata que el paciente efectivamente pagó.
      status: keptPaidAmount ? payment.status : "CANCELLED",
      advanceInboxDismissedAt: advancePaid ? undefined : now,
      remainderInboxDismissedAt: remainderPaid ? undefined : now,
    },
  });

  return { voided: !keptPaidAmount, keptPaidAmount };
}

/**
 * Quita del carrito lo que quedó colgado de una cita cancelada: si no, el
 * paciente sigue viendo la cita —o su saldo— esperando pago.
 */
export async function removeCartItemsForAppointment(params: {
  appointmentId: string;
  patientId: string;
  consultationTypeId: string;
  startTime: Date;
}): Promise<number> {
  const result = await prisma.cartItem.deleteMany({
    where: {
      userId: params.patientId,
      OR: [
        { type: "APPOINTMENT_REMAINDER", appointmentId: params.appointmentId },
        {
          type: "APPOINTMENT",
          consultationTypeId: params.consultationTypeId,
          appointmentStart: params.startTime,
        },
      ],
    },
  });
  return result.count;
}
