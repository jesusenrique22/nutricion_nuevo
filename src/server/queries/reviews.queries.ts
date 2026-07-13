import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { isPrismaReviewReady, prisma } from "@/server/db/prisma";
import type { PublicReview } from "@/types/review";

/** Tag de caché para las reseñas publicadas en el lobby. */
export const PUBLIC_REVIEWS_TAG = "public-reviews";

/** Máximo de reseñas que rotan en el carrusel del inicio. */
const MAX_PUBLIC_REVIEWS = 12;

const fetchPublishedReviews = unstable_cache(
  async (): Promise<PublicReview[]> => {
    if (!isPrismaReviewReady()) return [];

    try {
      const rows = await prisma.review.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: MAX_PUBLIC_REVIEWS,
        select: {
          id: true,
          authorName: true,
          rating: true,
          topic: true,
          body: true,
          publishedAt: true,
          createdAt: true,
        },
      });

      return rows.map((r) => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        topic: r.topic,
        body: r.body,
        publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
      }));
    } catch (err) {
      // No romper el lobby si la tabla aún no fue migrada.
      console.error("[getPublishedReviews]", err);
      return [];
    }
  },
  ["public-reviews", "v1"],
  { revalidate: 300, tags: [PUBLIC_REVIEWS_TAG] },
);

/** Reseñas publicadas para el lobby (con deduplicación por request). */
export const getPublishedReviews = cache(fetchPublishedReviews);

export function revalidatePublicReviews(): void {
  revalidateTag(PUBLIC_REVIEWS_TAG, "max");
}
