import { getAdminUserIds } from "@/lib/admin-users";
import { prisma } from "@/server/db/prisma";
import { createNotification } from "@/server/services/notification.service";
import type { ReviewTopic } from "@/types/review";

async function safeNotify(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // Notificaciones best-effort
  }
}

const REVIEW_TOPIC_BY_KIND: Record<
  "APPOINTMENT" | "RESOURCE" | "PRODUCT",
  ReviewTopic
> = {
  APPOINTMENT: "SERVICE",
  RESOURCE: "GENERAL",
  PRODUCT: "PRODUCT",
};

const REVIEW_KIND_LABEL: Record<
  "APPOINTMENT" | "RESOURCE" | "PRODUCT",
  string
> = {
  APPOINTMENT: "tu consulta",
  RESOURCE: "el recurso",
  PRODUCT: "tu compra",
};

/** Invita al paciente a dejar reseña tras una cita completada o compra concretada. */
export async function notifyReviewRequested(params: {
  patientId: string;
  itemTitle: string;
  itemKind: "APPOINTMENT" | "RESOURCE" | "PRODUCT";
  entityId?: string;
}) {
  await safeNotify(async () => {
    const pending = await prisma.review.findFirst({
      where: { userId: params.patientId, status: "PENDING" },
      select: { id: true },
    });
    if (pending) return;

    const topic = REVIEW_TOPIC_BY_KIND[params.itemKind];
    const kindLabel = REVIEW_KIND_LABEL[params.itemKind];

    await createNotification({
      recipientId: params.patientId,
      type: "REVIEW_REQUESTED",
      title: "¿Querés dejar una reseña?",
      body: `¿Cómo fue ${kindLabel} «${params.itemTitle}»? Tu opinión nos ayuda a mejorar.`,
      payload: {
        deepLink: `/dashboard/patient/reviews?topic=${topic}`,
        itemKind: params.itemKind,
        entityId: params.entityId,
        topic,
      },
    });
  });
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
