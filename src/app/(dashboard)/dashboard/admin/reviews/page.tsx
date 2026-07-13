import { AdminReviewsPanel } from "@/components/admin/admin-reviews-panel";
import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { formatActionError } from "@/lib/db-errors";
import { getAdminReviews } from "@/server/actions/review.queries";
import type { AdminReview } from "@/types/review";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  let reviews: AdminReview[] = [];
  let loadError: string | null = null;

  try {
    reviews = await getAdminReviews();
  } catch (err) {
    console.error("[admin/reviews]", err);
    loadError = formatActionError(
      err,
      "No se pudieron cargar las reseñas. Revisá la base de datos y las migraciones.",
    );
  }

  return (
    <ContentLobbyShell
      title="Reseñas"
      description="Aprobá las reseñas de tus pacientes para que se muestren en la página de inicio."
    >
      {loadError && (
        <p
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {loadError}
        </p>
      )}
      <AdminReviewsPanel reviews={reviews} />
    </ContentLobbyShell>
  );
}
