import { getAdminUserIds } from "@/lib/admin-users";
import { createNotification } from "@/server/services/notification.service";

async function safeNotify(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // Notificaciones best-effort
  }
}

/** Invita al paciente a dejar reseña tras una cita completada o compra concretada. */
export async function notifyReviewRequested(_params: {
  patientId: string;
  itemTitle: string;
  itemKind: "APPOINTMENT" | "RESOURCE" | "PRODUCT";
  entityId?: string;
}) {
  // Desactivado por pedido del cliente: la página de reseñas sigue disponible,
  // pero no se empujan notificaciones automáticas.
}

export async function notifyReviewSubmitted(params: {
  reviewId: string;
  authorName: string;
  rating: number;
}) {
  await safeNotify(async () => {
    const adminIds = await getAdminUserIds();
    await Promise.all(
      adminIds.map((id) =>
        createNotification({
          recipientId: id,
          type: "REVIEW_SUBMITTED",
          title: "Nueva reseña por aprobar",
          body: `${params.authorName} dejó una reseña de ${params.rating}★. Revisala y aprobala para publicarla en el inicio.`,
          payload: {
            deepLink: "/dashboard/admin/reviews",
            reviewId: params.reviewId,
          },
        }),
      ),
    );
  });
}

export async function notifyReviewResolved(params: {
  patientId: string;
  approved: boolean;
  adminNote?: string | null;
}) {
  await safeNotify(async () => {
    const body = params.approved
      ? "¡Gracias! Tu reseña fue aprobada y ya se muestra en la página de inicio."
      : `Tu reseña no fue aprobada para publicación.${
          params.adminNote ? ` Motivo: ${params.adminNote}` : ""
        }`;

    await createNotification({
      recipientId: params.patientId,
      type: "REVIEW_PUBLISHED",
      title: params.approved ? "Reseña publicada" : "Reseña no aprobada",
      body,
      payload: {
        deepLink: "/dashboard/patient/reviews",
        approved: params.approved,
      },
    });
  });
}
