import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { BrandSocialIcons } from "@/components/brand/brand-social-icons";
import { BRAND_PROFILE } from "@/lib/brand-assets";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import type { NutricionistaCvData } from "@/types/nutricionista-cv";

function CvSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-primary/25 pb-2 text-sm font-bold uppercase tracking-[0.12em] text-primary">
      {children}
    </h3>
  );
}

function ContactRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug text-foreground/80">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

export function NutricionistaCvDocument({ cv }: { cv: NutricionistaCvData }) {
  const photoSrc =
    cv.photoUrl?.trim() || BRAND_PROFILE.professional;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-sm shadow-[0_32px_80px_-20px_rgba(116,30,49,0.35)] ring-1 ring-primary/10">
        <div className="flex flex-col lg:flex-row">
          {/* Carpeta brandbook */}
          <aside className="relative flex min-h-[140px] flex-col justify-between bg-primary px-6 py-8 text-primary-foreground lg:min-h-[720px] lg:w-[220px] lg:shrink-0 lg:px-5 lg:py-10">
            <p className="text-center text-[9px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-primary-foreground/75 lg:text-left">
              Est. {cv.est}
              <br />
              {cv.city}
            </p>

            <div className="my-6 flex flex-1 flex-col items-center justify-end lg:my-0 lg:items-start lg:pb-4">
              <p
                className="text-center text-4xl font-extralight lowercase leading-none lg:text-left lg:text-[2.75rem]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                anttova
                <span className="text-primary-foreground/90">.</span>
              </p>
              <p className="mt-4 max-w-[180px] text-center text-[8px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-accent-soft lg:text-left">
                Wellness &amp; lifestyle
                <br />
                by {cv.name}
              </p>
            </div>

            <span
              aria-hidden
              className="absolute bottom-4 right-4 text-[10px] text-primary-foreground/50"
            >
              ®
            </span>
          </aside>

          {/* Hoja CV */}
          <div className="flex-1 bg-[#f2f0ed]">
            <div className="grid lg:grid-cols-[minmax(0,240px)_1fr]">
              {/* Columna izquierda del CV */}
              <div className="border-b border-primary/10 px-6 py-8 lg:border-b-0 lg:border-r lg:px-7 lg:py-10">
                <BrandLogo size="sm" />

                <h1 className="mt-6 text-xl font-bold leading-tight text-primary sm:text-2xl">
                  {cv.name}
                </h1>
                <p className="mt-1 text-sm font-semibold text-foreground/70">
                  {cv.title}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-foreground/65">
                  {cv.bio}
                </p>

                <div className="relative mx-auto my-8 h-36 w-36 overflow-hidden rounded-full ring-2 ring-primary/15 lg:mx-0">
                  <Image
                    src={photoSrc}
                    alt={cv.name}
                    fill
                    className="object-cover"
                    sizes="144px"
                    priority
                    unoptimized={shouldUnoptimizeImage(photoSrc)}
                  />
                </div>

                <CvSectionTitle>Contacto</CvSectionTitle>
                <ul className="mt-4 space-y-3">
                  <ContactRow icon="☎">
                    <a href={`tel:${cv.contact.phone.replace(/\s/g, "")}`}>
                      {cv.contact.phone}
                    </a>
                  </ContactRow>
                  <ContactRow icon="✉">
                    <a href={`mailto:${cv.contact.email}`}>{cv.contact.email}</a>
                  </ContactRow>
                  <ContactRow icon="⌖">{cv.contact.location}</ContactRow>
                </ul>

                <div className="mt-8">
                  <CvSectionTitle>Habilidades</CvSectionTitle>
                  <ul className="mt-4 space-y-1.5 text-sm text-foreground/75">
                    {cv.skills.map((skill) => (
                      <li key={skill} className="flex gap-2">
                        <span className="text-primary">·</span>
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <CvSectionTitle>Sígueme</CvSectionTitle>
                  <div className="mt-4 scale-90 origin-left">
                    <BrandSocialIcons className="justify-start gap-3 text-primary" />
                  </div>
                </div>

                <div className="mt-10 hidden lg:block">
                  <Image
                    src="/brand/avatar-mark.svg"
                    alt=""
                    width={28}
                    height={28}
                    aria-hidden
                  />
                </div>
              </div>

              {/* Columna derecha del CV */}
              <div className="px-6 py-8 lg:px-10 lg:py-10">
                <CvSectionTitle>Formación académica</CvSectionTitle>
                <div className="mt-5 space-y-6">
                  {cv.education.map((item) => (
                    <div
                      key={item.title}
                      className="grid gap-2 sm:grid-cols-[72px_1fr]"
                    >
                      <p className="text-sm font-bold tabular-nums text-primary">
                        {item.year}
                      </p>
                      <div>
                        <p className="font-bold text-foreground">{item.title}</p>
                        <p className="mt-0.5 text-sm text-foreground/60">
                          {item.place}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10">
                  <CvSectionTitle>Experiencia laboral</CvSectionTitle>
                  <div className="mt-5 space-y-8">
                    {cv.experience.map((item) => (
                      <div
                        key={`${item.year}-${item.company}`}
                        className="grid gap-2 sm:grid-cols-[120px_1fr]"
                      >
                        <p className="text-xs font-bold leading-snug text-primary sm:text-sm">
                          {item.year}
                        </p>
                        <div>
                          <p className="font-bold text-foreground">
                            {item.role}
                            <span className="font-semibold text-foreground/55">
                              {" "}
                              · {item.company}
                            </span>
                          </p>
                          {item.bullets.length > 0 && (
                            <ul className="mt-2 space-y-1 text-sm text-foreground/70">
                              {item.bullets.map((b) => (
                                <li key={b} className="flex gap-2">
                                  <span className="text-primary">·</span>
                                  {b}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <footer className="mt-12 flex flex-col items-center gap-4 border-t border-primary/10 pt-8 sm:flex-row sm:justify-between">
                  <Image
                    src="/brand/avatar-mark.svg"
                    alt=""
                    width={32}
                    height={32}
                    aria-hidden
                    className="opacity-80"
                  />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
                    {cv.city} / Est. {cv.est}
                  </p>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/register"
          className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:scale-105"
        >
          Agendar consulta
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-primary/25 bg-surface px-8 py-3 text-sm font-semibold text-primary transition hover:bg-muted"
        >
          Ya tengo cuenta
        </Link>
      </div>
    </div>
  );
}
