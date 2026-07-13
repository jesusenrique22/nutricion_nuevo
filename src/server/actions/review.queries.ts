"use server";

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/security/auth-guards";
import { isPrismaReviewReady, prisma } from "@/server/db/prisma";
import type { AdminReview, MyReview } from "@/types/review";

/**
 * Un paciente puede dejar reseña si ya tuvo al menos una cita completada
 * o una compra concretada (recurso o producto).
 */
export async function canUserReview(userId: string): Promise<boolean> {
  if (!isPrismaReviewReady()) return false;

  const [completedAppointments, grantedResource, grantedProduct] =
    await Promise.all([
      prisma.appointment.count({
        where: { patientId: userId, status: "COMPLETED" },
      }),
      prisma.resourcePurchase.count({
        where: { userId, status: "GRANTED" },
      }),
      prisma.productPurchase.count({
        where: { userId, status: "GRANTED" },
      }),
    ]);

  return completedAppointments + grantedResource + grantedProduct > 0;
}

export interface PatientReviewEligibility {
  canReview: boolean;
  hasPending: boolean;
  reviews: MyReview[];
}

export async function getMyReviewState(): Promise<PatientReviewEligibility> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return { canReview: false, hasPending: false, reviews: [] };
  }

  if (!isPrismaReviewReady()) {
    return { canReview: false, hasPending: false, reviews: [] };
  }

  try {
    const [rows, eligible] = await Promise.all([
      prisma.review.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rating: true,
          topic: true,
          body: true,
          status: true,
          adminNote: true,
          createdAt: true,
        },
      }),
      canUserReview(session.user.id),
    ]);

    const reviews: MyReview[] = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      topic: r.topic,
      body: r.body,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      canReview: eligible,
      hasPending: reviews.some((r) => r.status === "PENDING"),
      reviews,
    };
  } catch (err) {
    console.error("[getMyReviewState]", err);
    return { canReview: false, hasPending: false, reviews: [] };
  }
}

export async function getAdminReviews(): Promise<AdminReview[]> {
  if (!(await requireAdmin()) || !isPrismaReviewReady()) return [];

  try {
    const rows = await prisma.review.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        userId: true,
        authorName: true,
        rating: true,
        topic: true,
        body: true,
        status: true,
        adminNote: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });

    return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    authorName: r.authorName,
    authorEmail: r.user.email,
    rating: r.rating,
    topic: r.topic,
    body: r.body,
    status: r.status,
    adminNote: r.adminNote,
    createdAt: r.createdAt.toISOString(),
  }));
  } catch (err) {
    console.error("[getAdminReviews]", err);
    return [];
  }
}
