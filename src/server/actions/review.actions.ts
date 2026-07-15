"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { formatActionError } from "@/lib/db-errors";
import { requireAdmin } from "@/lib/security/auth-guards";
import {
  moderateReviewSchema,
  submitReviewSchema,
} from "@/lib/validators/review";
import { prisma } from "@/server/db/prisma";
import { revalidatePublicReviews } from "@/server/queries/reviews.queries";
import { canUserReview } from "@/server/actions/review.queries";
import {
  notifyReviewResolved,
  notifyReviewSubmitted,
} from "@/server/services/review-notify.service";

export type ReviewActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function submitReview(input: {
  rating: number;
  topic: string;
  body: string;
}): Promise<ReviewActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return { ok: false, message: "No autorizado." };
    }

    const parsed = submitReviewSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    if (!(await canUserReview(session.user.id))) {
      return {
        ok: false,
        message:
          "Podés dejar una reseña cuando tengas al menos una cita completada o una compra.",
      };
    }

    const pending = await prisma.review.findFirst({
      where: { userId: session.user.id, status: "PENDING" },
      select: { id: true },
    });
    if (pending) {
      return {
        ok: false,
        message: "Ya enviaste una reseña. ¡Gracias!",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });
    if (!user) {
      return { ok: false, message: "Usuario no encontrado." };
    }

    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        authorName: user.name,
        rating: parsed.data.rating,
        topic: parsed.data.topic,
        body: parsed.data.body,
        status: "PENDING",
      },
      select: { id: true },
    });

    await notifyReviewSubmitted({
      reviewId: review.id,
      authorName: user.name,
      rating: parsed.data.rating,
    });

    revalidatePath("/dashboard/patient/reviews");
    revalidatePath("/dashboard/admin/reviews");
    return { ok: true };
  } catch (err) {
    console.error("[submitReview]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo enviar la reseña."),
    };
  }
}

export async function moderateReview(input: {
  reviewId: string;
  approved: boolean;
  adminNote?: string;
}): Promise<ReviewActionResult> {
  try {
    if (!(await requireAdmin())) {
      return { ok: false, message: "No autorizado." };
    }

    const parsed = moderateReviewSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Datos inválidos." };
    }

    const review = await prisma.review.findUnique({
      where: { id: parsed.data.reviewId },
      select: { id: true, userId: true },
    });
    if (!review) {
      return { ok: false, message: "Reseña no encontrada." };
    }

    const adminNote = parsed.data.adminNote?.trim() || null;

    await prisma.review.update({
      where: { id: review.id },
      data: parsed.data.approved
        ? {
            status: "PUBLISHED",
            publishedAt: new Date(),
            adminNote,
          }
        : {
            status: "REJECTED",
            publishedAt: null,
            adminNote,
          },
    });

    await notifyReviewResolved({
      patientId: review.userId,
      approved: parsed.data.approved,
      adminNote,
    });

    revalidatePublicReviews();
    revalidatePath("/");
    revalidatePath("/dashboard/admin/reviews");
    revalidatePath("/dashboard/patient/reviews");
    return { ok: true };
  } catch (err) {
    console.error("[moderateReview]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo actualizar la reseña."),
    };
  }
}

export async function deleteReview(input: {
  reviewId: string;
}): Promise<ReviewActionResult> {
  try {
    if (!(await requireAdmin())) {
      return { ok: false, message: "No autorizado." };
    }

    const review = await prisma.review.findUnique({
      where: { id: input.reviewId },
      select: { status: true },
    });
    if (!review) {
      return { ok: false, message: "Reseña no encontrada." };
    }

    await prisma.review.delete({ where: { id: input.reviewId } });

    if (review.status === "PUBLISHED") {
      revalidatePublicReviews();
      revalidatePath("/");
    }
    revalidatePath("/dashboard/admin/reviews");
    return { ok: true };
  } catch (err) {
    console.error("[deleteReview]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo eliminar la reseña."),
    };
  }
}
