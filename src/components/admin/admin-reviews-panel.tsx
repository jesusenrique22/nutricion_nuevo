"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StarDisplay } from "@/components/ui/star-rating";
import { deleteReview, moderateReview } from "@/server/actions/review.actions";
import {
  REVIEW_STATUS_LABELS,
  REVIEW_TOPIC_LABELS,
  type AdminReview,
} from "@/types/review";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<AdminReview["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
};

function ReviewCard({ review }: { review: AdminReview }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function moderate(approved: boolean) {
    startTransition(async () => {
      const res = await moderateReview({
        reviewId: review.id,
        approved,
        adminNote: note.trim() || undefined,
      });
      if (res.ok) router.refresh();
      else alert(res.message);
    });
  }

  function remove() {
    if (!confirm("¿Eliminar esta reseña definitivamente?")) return;
    startTransition(async () => {
      const res = await deleteReview({ reviewId: review.id });
      if (res.ok) router.refresh();
      else alert(res.message);
    });
  }

  return (
    <article className="rounded-2xl border border-foreground/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StarDisplay rating={review.rating} size="sm" />
            <span className="text-xs text-foreground/50">
              {REVIEW_TOPIC_LABELS[review.topic]}
            </span>
          </div>
          <p className="mt-2 text-sm">
            <Link
              href={`/dashboard/admin/patients/${review.userId}`}
              className="font-semibold text-primary hover:underline"
            >
              {review.authorName}
            </Link>
            <span className="text-foreground/50"> · {review.authorEmail}</span>
          </p>
          <p className="mt-1 text-xs text-foreground/45">{fmt(review.createdAt)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[review.status]}`}
        >
          {REVIEW_STATUS_LABELS[review.status]}
        </span>
      </div>

      <p className="mt-3 rounded-xl bg-muted/30 px-3 py-2 text-sm text-foreground/80">
        {review.body}
      </p>

      {review.status === "PENDING" && (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Nota para el paciente (opcional, útil si la rechazás)"
            className="mt-3 w-full resize-none rounded-xl border border-foreground/15 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => moderate(true)}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Aprobar y publicar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => moderate(false)}
              className="rounded-full border border-red-300 bg-white px-5 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        </>
      )}

      {review.status !== "PENDING" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {review.status === "PUBLISHED" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => moderate(false)}
              className="rounded-full border border-foreground/20 bg-white px-4 py-1.5 text-xs font-semibold text-foreground/70 disabled:opacity-50"
            >
              Quitar del inicio
            </button>
          )}
          {review.status === "REJECTED" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => moderate(true)}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              Aprobar y publicar
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={remove}
            className="rounded-full border border-red-200 bg-white px-4 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      )}

      {review.adminNote && review.status === "REJECTED" && (
        <p className="mt-2 text-xs text-foreground/50">
          Nota enviada: {review.adminNote}
        </p>
      )}
    </article>
  );
}

export function AdminReviewsPanel({ reviews }: { reviews: AdminReview[] }) {
  const pending = reviews.filter((r) => r.status === "PENDING");
  const resolved = reviews.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
          Por aprobar ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-foreground/15 bg-white px-6 py-10 text-center text-sm text-foreground/50">
            No hay reseñas pendientes de aprobación.
          </p>
        ) : (
          pending.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/60">
          Historial ({resolved.length})
        </h2>
        {resolved.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-foreground/15 bg-white px-6 py-10 text-center text-sm text-foreground/50">
            Todavía no moderaste reseñas.
          </p>
        ) : (
          resolved.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </section>
    </div>
  );
}
