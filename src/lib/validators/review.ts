import { z } from "zod";
import {
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
} from "@/types/review";

export const reviewTopicSchema = z.enum([
  "GENERAL",
  "SERVICE",
  "PRODUCT",
  "CARE",
]);

export const submitReviewSchema = z.object({
  rating: z
    .number({ message: "Elegí una calificación." })
    .int()
    .min(REVIEW_RATING_MIN, "Elegí al menos una estrella.")
    .max(REVIEW_RATING_MAX, "Máximo 5 estrellas."),
  topic: reviewTopicSchema,
  body: z
    .string()
    .trim()
    .min(REVIEW_BODY_MIN, `Contanos un poco más (mínimo ${REVIEW_BODY_MIN} caracteres).`)
    .max(REVIEW_BODY_MAX, `Máximo ${REVIEW_BODY_MAX} caracteres.`),
});

export const moderateReviewSchema = z.object({
  reviewId: z.string().min(1),
  approved: z.boolean(),
  adminNote: z.string().trim().max(300).optional(),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
