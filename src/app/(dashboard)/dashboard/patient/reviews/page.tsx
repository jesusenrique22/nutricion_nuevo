import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { ReviewForm } from "@/components/reviews/review-form";
import { StarDisplay } from "@/components/ui/star-rating";
import { getMyReviewState } from "@/server/actions/review.queries";
import {
  REVIEW_STATUS_LABELS,
  REVIEW_TOPIC_LABELS,
  type ReviewStatus,
} from "@/types/review";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<ReviewStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PatientReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const params = await searchParams;
  const topicParam = params.topic?.toUpperCase();
  const initialTopic =
    topicParam === "SERVICE" ||
    topicParam === "PRODUCT" ||
    topicParam === "CARE" ||
    topicParam === "GENERAL"
      ? topicParam
      : undefined;

  const { canReview, hasPending, reviews } = await getMyReviewState();

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <BrandDashboardHeader
        eyebrow="Panel paciente"
        title="Dejá tu reseña"
        description="Compartí tu experiencia. Tras la aprobación de la nutricionista, se mostrará en la página de inicio."
      />

      <section>
        <ReviewForm
          canReview={canReview}
          hasPending={hasPending}
          initialTopic={initialTopic}
        />
      </section>

      {reviews.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
            Mis reseñas
          </h2>
          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-foreground/10 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <StarDisplay rating={review.rating} size="sm" />
                    <span className="text-xs text-foreground/50">
                      {REVIEW_TOPIC_LABELS[review.topic]}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[review.status]}`}
                  >
                    {REVIEW_STATUS_LABELS[review.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm text-foreground/80">{review.body}</p>
                <p className="mt-2 text-xs text-foreground/45">
                  {fmt(review.createdAt)}
                </p>
                {review.status === "REJECTED" && review.adminNote && (
                  <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                    Motivo: {review.adminNote}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
