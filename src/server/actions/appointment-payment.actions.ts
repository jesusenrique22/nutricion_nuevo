"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { applyRemainderCartPayment } from "@/lib/appointment-remainder-checkout";
import { getPaymentCheckoutPolicy } from "@/lib/payment-checkout-policy";

export type AppointmentPaymentActionResult =
  | { ok: true }
  | { ok: false; message: string };

/** @deprecated Usar carrito — se mantiene por compatibilidad interna. */
export async function submitAppointmentRemainderPayment(params: {
  appointmentId: string;
  paymentMethod: string;
  paymentReference?: string;
  paymentProofUrls?: string[];
  paymentNote?: string;
}): Promise<AppointmentPaymentActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "No autorizado." };
  }

  const policy = await getPaymentCheckoutPolicy();
  if (!params.paymentMethod?.trim()) {
    return { ok: false, message: "Seleccioná un modo de pago." };
  }
  if (policy.referenceRequired && !params.paymentReference?.trim()) {
    return {
      ok: false,
      message: `Indicá ${policy.referenceLabel.toLowerCase()}.`,
    };
  }
  if ((params.paymentProofUrls ?? []).length > policy.maxProofFiles) {
    return {
      ok: false,
      message: "Solo se permite una captura por comprobante.",
    };
  }

  const res = await applyRemainderCartPayment({
    patientId: session.user.id,
    patientName: session.user.name ?? "Paciente",
    appointmentId: params.appointmentId,
    payload: {
      patientPaymentMethod: params.paymentMethod,
      patientPaymentReference: params.paymentReference?.trim() ?? null,
      patientPaymentNote: params.paymentNote?.trim() ?? null,
      patientPaymentProofUrls: params.paymentProofUrls ?? [],
    },
  });

  if (res.ok) {
    revalidatePath("/dashboard/patient/appointments");
    revalidatePath("/dashboard/patient/cart");
    revalidatePath("/dashboard/patient/cart/historial");
    revalidatePath("/dashboard/admin/payments");
    revalidatePath("/dashboard/notifications");
  }

  return res;
}
