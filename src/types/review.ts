export type ReviewStatus = "PENDING" | "PUBLISHED" | "REJECTED";
export type ReviewTopic = "GENERAL" | "SERVICE" | "PRODUCT" | "CARE";

/** Límites del cuerpo de la reseña. */
export const REVIEW_BODY_MIN = 10;
export const REVIEW_BODY_MAX = 280;

export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;

/** Opciones de tema que el paciente puede elegir al calificar. */
export const REVIEW_TOPICS: { value: ReviewTopic; label: string }[] = [
  { value: "GENERAL", label: "Experiencia general" },
  { value: "SERVICE", label: "Servicio / consultas" },
  { value: "PRODUCT", label: "Productos" },
  { value: "CARE", label: "Atención y trato" },
];

export const REVIEW_TOPIC_LABELS: Record<ReviewTopic, string> =
  REVIEW_TOPICS.reduce(
    (acc, t) => {
      acc[t.value] = t.label;
      return acc;
    },
    {} as Record<ReviewTopic, string>,
  );

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: "En revisión",
  PUBLISHED: "Publicada",
  REJECTED: "No aprobada",
};

/** Reseña visible en el lobby (solo datos públicos). */
export interface PublicReview {
  id: string;
  authorName: string;
  rating: number;
  topic: ReviewTopic;
  body: string;
  publishedAt: string;
}

/** Reseña del propio paciente (incluye estado). */
export interface MyReview {
  id: string;
  rating: number;
  topic: ReviewTopic;
  body: string;
  status: ReviewStatus;
  adminNote: string | null;
  createdAt: string;
}

/** Reseña vista por el admin para moderar. */
export interface AdminReview {
  id: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  topic: ReviewTopic;
  body: string;
  status: ReviewStatus;
  adminNote: string | null;
  createdAt: string;
}
