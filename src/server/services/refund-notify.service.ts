import { getAdminUserIds } from "@/lib/admin-users";
import { createNotification } from "@/server/services/notification.service";

async function safeNotify(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // MongoDB opcional
  }
}

export async function notifyRefundRequested(params: {
  patientId: string;
  patientName: string;
  itemTitle: string;
  itemKind: "APPOINTMENT" | "RESOURCE";
  entityId: string;
}) {
  await safeNotify(async () => {
    const adminIds = await getAdminUserIds();
    const kindLabel =
      params.itemKind === "APPOINTMENT" ? "cita" : "recurso";
    await Promise.all(
      adminIds.map((id) =>
        createNotification({
          recipientId: id,
          type: "REFUND_REQUESTED",
          title: "Solicitud de reembolso",
          body: `${params.patientName} pidió reembolso de ${kindLabel}: ${params.itemTitle}. Contactá al paciente y resolvé la solicitud.`,
          payload: {
            deepLink:
              params.itemKind === "APPOINTMENT"
                ? `/dashboard/admin/calendar?appointmentId=${params.entityId}`
                : `/dashboard/admin/patients/${params.patientId}`,
            patientId: params.patientId,
            entityId: params.entityId,
            itemKind: params.itemKind,
          },
        }),
      ),
    );
  });
}

export async function notifyRefundResolved(params: {
  patientId: string;
  itemTitle: string;
  approved: boolean;
  adminNote?: string | null;
}) {
  await safeNotify(async () => {
    const body = params.approved
      ? `Tu reembolso de «${params.itemTitle}» fue aceptado. Anttova se pondrá en contacto si hace falta.`
      : `Tu solicitud de reembolso de «${params.itemTitle}» no fue aceptada.${
          params.adminNote ? ` Motivo: ${params.adminNote}` : ""
        }`;

    await createNotification({
      recipientId: params.patientId,
      type: "REFUND_RESOLVED",
      title: params.approved ? "Reembolso aceptado" : "Reembolso no aceptado",
      body,
      payload: {
        deepLink: "/dashboard/patient/cart/historial",
        approved: params.approved,
      },
    });
  });
}
