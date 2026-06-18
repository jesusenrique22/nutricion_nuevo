import Image from "next/image";
import Link from "next/link";
import { BRAND_PROFILE } from "@/lib/brand-assets";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import type {
  NutricionistaAboutData,
  NutricionistaCvData,
} from "@/types/nutricionista-cv";

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 text-sm leading-relaxed text-foreground/80 sm:text-base"
        >
          <span
            aria-hidden
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function NutricionistaAboutSection({
  about,
  cv,
}: {
  about: NutricionistaAboutData;
  cv: NutricionistaCvData;
}) {
  const photoSrc = cv.photoUrl?.trim() || BRAND_PROFILE.professional;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-14">
      <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted shadow-[0_24px_60px_-24px_rgba(116,30,49,0.25)] ring-1 ring-primary/10">
          <Image
            src={photoSrc}
            alt={cv.name}
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 90vw, 480px"
            unoptimized={shouldUnoptimizeImage(photoSrc)}
            priority
          />
        </div>
        <p className="mt-4 text-center text-sm font-semibold text-primary lg:text-left">
          {cv.name}
        </p>
        <p className="mt-0.5 text-center text-xs uppercase tracking-[0.14em] text-foreground/50 lg:text-left">
          {cv.title}
        </p>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {about.headline}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-foreground/75 sm:text-base">
            {about.intro}
          </p>
          <BulletList items={about.highlights} />
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {about.approachHeadline}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-foreground/75 sm:text-base">
            {about.approachIntro}
          </p>
          <BulletList items={about.approachHighlights} />
          {about.approachClosing.trim() && (
            <p className="mt-5 text-sm font-semibold leading-relaxed text-foreground sm:text-base">
              {about.approachClosing}
            </p>
          )}
        </section>

        <div className="pt-2">
          <Link
            href="/nutricionista/especialidad"
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-surface px-6 py-3 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
          >
            {about.specialtyLinkLabel}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
