"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import { StarDisplay } from "@/components/ui/star-rating";
import { REVIEW_TOPIC_LABELS, type PublicReview } from "@/types/review";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ReviewsShowcase({ reviews }: { reviews: PublicReview[] }) {
  const [index, setIndex] = useState(0);

  const hasReviews = reviews.length > 0;
  const total = reviews.length;

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, 6000);
    return () => clearInterval(timer);
  }, [total]);

  if (!hasReviews) return null;

  const review = reviews[index];

  return (
    <section
      id="resenas"
      className="lobby-panel relative scroll-mt-20 overflow-hidden bg-gradient-to-b from-muted/40 to-background py-20 sm:min-h-[85svh] sm:py-28"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-accent-soft/20 blur-3xl"
        animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col justify-center px-6 text-center sm:min-h-[60svh]">
        <Reveal direction="fade">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent">
            Testimonios
          </p>
          <h2 className="mt-3 text-3xl font-extralight uppercase tracking-tight text-primary sm:text-4xl">
            Lo que dicen nuestros pacientes
          </h2>
        </Reveal>

        <div className="relative mt-12 min-h-[280px] sm:min-h-[240px]">
          <AnimatePresence mode="wait">
            <motion.figure
              key={review.id}
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-2xl rounded-3xl bg-surface p-8 ring-1 ring-primary/12 sm:p-10"
            >
              <StarDisplay
                rating={review.rating}
                size="md"
                className="justify-center"
              />
              <blockquote className="mt-6 text-lg font-light leading-relaxed text-foreground/85 sm:text-xl">
                “{review.body}”
              </blockquote>
              <figcaption className="mt-6 flex items-center justify-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {initialsOf(review.authorName)}
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold text-primary">
                    {review.authorName}
                  </span>
                  <span className="block text-xs text-foreground/50">
                    {REVIEW_TOPIC_LABELS[review.topic]}
                  </span>
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        {total > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {reviews.map((r, i) => (
              <button
                key={r.id}
                type="button"
                aria-label={`Ver reseña ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-10 bg-primary"
                    : "w-4 bg-primary/25 hover:bg-primary/45"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
