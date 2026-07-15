"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StarRatingInput } from "@/components/ui/star-rating";
import { submitReview } from "@/server/actions/review.actions";
import {
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_TOPICS,
  type ReviewTopic,
} from "@/types/review";

export function ReviewForm({
  canReview,
  hasPending,
  initialTopic,
}: {
  canReview: boolean;
  hasPending: boolean;
  initialTopic?: ReviewTopic;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [topic, setTopic] = useState<ReviewTopic>(initialTopic ?? "GENERAL");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canReview) {
    return (
      <div className="rounded-2xl border border-dashed border-foreground/15 bg-white/60 px-6 py-8 text-center">
        <p className="text-sm text-foreground/60">
          Vas a poder dejar tu reseña cuando tengas al menos una cita completada
          o una compra concretada. ¡Gracias por acompañarnos!
        </p>
      </div>
    );
  }

  if (hasPending) {
    return (
      <div className="rounded-2xl border border-primary/15 bg-primary/5 px-6 py-8 text-center">
        <p className="text-sm text-foreground/70">
          ¡Gracias! Ya recibimos tu reseña.
        </p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (rating < 1) {
      setMessage({ type: "error", text: "Elegí al menos una estrella." });
      return;
    }
    if (body.trim().length < REVIEW_BODY_MIN) {
      setMessage({
        type: "error",
        text: `Contanos un poco más (mínimo ${REVIEW_BODY_MIN} caracteres).`,
      });
      return;
    }

    startTransition(async () => {
      const res = await submitReview({ rating, topic, body: body.trim() });
      if (res.ok) {
        setMessage({
          type: "success",
          text: "¡Gracias! Ya recibimos tu reseña.",
        });
        setRating(0);
        setBody("");
        setTopic("GENERAL");
        router.refresh();
      } else {
        setMessage({ type: "error", text: res.message });
      }
    });
  }

  const remaining = REVIEW_BODY_MAX - body.length;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-foreground/10 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="text-sm font-semibold text-foreground/80">
          Tu calificación
        </label>
        <div className="mt-2">
          <StarRatingInput
            value={rating}
            onChange={setRating}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="mt-5">
        <label
          htmlFor="review-topic"
          className="text-sm font-semibold text-foreground/80"
        >
          ¿Sobre qué es tu reseña?
        </label>
        <select
          id="review-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value as ReviewTopic)}
          disabled={isPending}
          className="mt-2 w-full rounded-xl border border-foreground/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          {REVIEW_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label
          htmlFor="review-body"
          className="text-sm font-semibold text-foreground/80"
        >
          Tu experiencia
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, REVIEW_BODY_MAX))}
          disabled={isPending}
          rows={4}
          maxLength={REVIEW_BODY_MAX}
          placeholder="Contanos cómo fue tu experiencia con la atención, el servicio o los productos…"
          className="mt-2 w-full resize-none rounded-xl border border-foreground/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <p
          className={`mt-1 text-right text-xs ${
            remaining <= 20 ? "text-amber-600" : "text-foreground/45"
          }`}
        >
          {remaining} caracteres restantes
        </p>
      </div>

      {message && (
        <p
          role="alert"
          className={`mt-4 rounded-xl px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-primary/5 text-primary"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Enviando…" : "Enviar reseña"}
      </button>
    </form>
  );
}
