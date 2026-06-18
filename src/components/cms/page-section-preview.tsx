"use client";

/**
 * Panel de previsualización en vivo para el módulo Personalizar.
 * Renderiza los componentes reales de la landing con el estado actual del editor.
 * Se muestra a la derecha del editor como columna sticky.
 */

import Image from "next/image";
import type { SiteContentDTO } from "@/server/actions/cms.actions";
import { siteFieldLabel } from "@/lib/cms-labels";
import type { LandingImagesData } from "@/types/landing-images";
import type { NutricionistaPageData } from "@/types/nutricionista-cv";
import type { PaymentCheckoutPolicy } from "@/types/payment-checkout-policy";
import { BRAND_PROFILE } from "@/lib/brand-assets";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";

// ─── Hero preview ─────────────────────────────────────────────────────────

function HeroPreview({ images }: { images: LandingImagesData }) {
  const slides = images.heroSlides.length
    ? images.heroSlides
    : DEFAULT_LANDING_IMAGES.heroSlides;

  return (
    <div className="space-y-3">
      {slides.map((slide, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl"
          style={{ aspectRatio: "16/9" }}
        >
          {slide.src ? (
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              className="object-cover object-center"
              sizes="400px"
              unoptimized={slide.src.startsWith("/uploads/")}
            />
          ) : (
            <div className="absolute inset-0 bg-primary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/50 to-primary/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/70 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
              Est. 2025 · Buenos Aires
            </p>
            {slide.line1 && (
              <p className="mt-1 text-base font-extralight uppercase leading-tight tracking-tight text-white">
                {slide.line1}
              </p>
            )}
            {slide.line2 && (
              <p className="mt-0.5 text-xs font-medium text-white/80">
                {slide.line2}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <div className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-primary">
                Empezar ahora
              </div>
              <div className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-semibold text-white">
                Ver paquetes
              </div>
            </div>
          </div>
          {slides.length > 1 && (
            <div className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2 py-0.5 text-[9px] text-white/70">
              {i + 1}/{slides.length}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Gallery preview ──────────────────────────────────────────────────────

function GalleryPreview({ images }: { images: LandingImagesData }) {
  const gallery = images.gallery.length
    ? images.gallery
    : DEFAULT_LANDING_IMAGES.gallery;

  return (
    <div className="rounded-xl bg-primary p-3">
      <p className="mb-3 text-center text-[9px] font-semibold uppercase tracking-[0.24em] text-white/60">
        Balance · Energía · Bienestar
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {gallery.slice(0, 6).map((item, i) => (
          <div key={i} className="aspect-square overflow-hidden rounded-lg">
            {item.src ? (
              <Image
                src={item.src}
                alt={item.alt}
                width={120}
                height={120}
                className="h-full w-full object-cover"
                unoptimized={item.src.startsWith("/uploads/")}
              />
            ) : (
              <div className="h-full w-full bg-white/10" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Services (pillars) preview ───────────────────────────────────────────

function ServicesPreview({ images }: { images: LandingImagesData }) {
  const SERVICES = [
    { key: "nutrition" as const, num: "01", title: "Nutrición consciente", desc: "Plan personalizado, sin dietas extremas." },
    { key: "training" as const, num: "02", title: "Entrenamiento a medida", desc: "Rutinas pensadas para tu cuerpo." },
    { key: "anthropometry" as const, num: "03", title: "Mediciones precisas", desc: "Antropometría ISAK y composición corporal." },
  ];
  const services = images.services;

  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-foreground/40">
        Servicios
      </p>
      {SERVICES.map(({ key, num, title, desc }) => (
        <div key={key} className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
            {services[key] ? (
              <Image
                src={services[key]}
                alt={title}
                fill
                className="object-cover"
                sizes="56px"
                unoptimized={services[key].startsWith("/uploads/")}
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>
          <div>
            <p className="text-[9px] font-semibold text-primary/60">{num}</p>
            <p className="text-xs font-bold">{title}</p>
            <p className="text-[10px] text-foreground/55">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Plans preview ────────────────────────────────────────────────────────

function PlansPreview({ images }: { images: LandingImagesData }) {
  const PLANS = [
    { key: "nutrition" as const, label: "Nutricional" },
    { key: "training" as const, label: "Entrenamiento" },
    { key: "anthropometry" as const, label: "Antropometría" },
  ];

  return (
    <div className="rounded-xl bg-background p-3">
      <p className="mb-3 text-[9px] font-semibold uppercase tracking-wider text-foreground/40">
        Paquetes
      </p>
      <div className="grid grid-cols-3 gap-2">
        {PLANS.map(({ key, label }) => (
          <div key={key} className="overflow-hidden rounded-xl border border-foreground/10">
            <div className="relative aspect-square">
              {images.plans[key] ? (
                <Image
                  src={images.plans[key]}
                  alt={label}
                  fill
                  className="object-cover"
                  sizes="100px"
                  unoptimized={images.plans[key].startsWith("/uploads/")}
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
            <div className="bg-white px-2 py-1.5 text-center">
              <p className="text-[9px] font-semibold">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Other images preview ─────────────────────────────────────────────────

function OtherImagesPreview({ images }: { images: LandingImagesData }) {
  return (
    <div className="space-y-2">
      {[
        { key: "philosophyImage" as const, label: "Filosofía" },
        { key: "brandSectionImage" as const, label: "La marca" },
        { key: "ctaBackground" as const, label: "CTA final" },
      ].map(({ key, label }) => (
        <div key={key} className="relative overflow-hidden rounded-xl" style={{ height: 80 }}>
          {images[key] ? (
            <Image
              src={images[key]}
              alt={label}
              fill
              className="object-cover"
              sizes="400px"
              unoptimized={images[key].startsWith("/uploads/")}
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
          <div className="absolute inset-0 bg-black/30 flex items-end p-2">
            <span className="text-[9px] font-semibold text-white">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Texts preview ────────────────────────────────────────────────────────

function TextsPreview({ blocks }: { blocks: SiteContentDTO[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block) => {
        const fields = Object.entries(block.data as Record<string, unknown>).map(
          ([key, value]) => ({ key, value: String(value) }),
        );

        const isHero = block.slug === "landing_hero";
        const isPackages = block.slug === "landing_packages";

        if (isHero) {
          const headline = fields.find((f) => f.key === "headline")?.value ?? "";
          const subheadline = fields.find((f) => f.key === "subheadline")?.value ?? "";
          const ctaLabel = fields.find((f) => f.key === "ctaLabel")?.value ?? "";

          return (
            <div
              key={block.slug}
              className="overflow-hidden rounded-xl"
              style={{
                background: "linear-gradient(135deg, #741e31 0%, #5a1626 100%)",
                minHeight: 120,
                padding: "16px",
              }}
            >
              {headline && (
                <p className="text-base font-extralight uppercase leading-tight text-white">
                  {headline}
                </p>
              )}
              {subheadline && (
                <p className="mt-1 text-xs text-white/75">{subheadline}</p>
              )}
              {ctaLabel && (
                <div className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-primary">
                  {ctaLabel}
                </div>
              )}
            </div>
          );
        }

        if (isPackages) {
          const prices = fields.filter((f) =>
            ["nutPrice", "entPrice", "antPrice"].includes(f.key),
          );
          const note = fields.find((f) => f.key === "currencyNote")?.value;
          const labels: Record<string, string> = {
            nutPrice: "Nutrición",
            entPrice: "Entrenamiento",
            antPrice: "Antropometría",
          };

          return (
            <div key={block.slug} className="rounded-xl border border-foreground/10 bg-white p-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-primary/50">
                Paquetes y precios
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {prices.map(({ key, value }) => (
                  <div key={key} className="rounded-lg bg-muted p-2 text-center">
                    <p className="text-[9px] text-foreground/50">{labels[key]}</p>
                    <p className="text-xs font-bold text-primary">{value || "—"}</p>
                  </div>
                ))}
              </div>
              {note && (
                <p className="mt-2 text-center text-[9px] text-foreground/45">{note}</p>
              )}
            </div>
          );
        }

        return (
          <div key={block.slug} className="rounded-xl border border-foreground/10 bg-white p-3">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-primary/50">
              {block.title ?? block.slug}
            </p>
            <div className="space-y-1.5">
              {fields.slice(0, 4).map(({ key, value }) => (
                <div key={key}>
                  <p className="text-[9px] font-semibold text-foreground/40">
                    {siteFieldLabel(block.slug, key)}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/80 line-clamp-2">
                    {value || <span className="text-foreground/25">—</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Profile preview ──────────────────────────────────────────────────────

function ProfilePreview({ data }: { data: NutricionistaPageData }) {
  const photoSrc = data.cv.photoUrl?.trim() || BRAND_PROFILE.professional;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        className="overflow-hidden rounded-xl p-4"
        style={{ background: "linear-gradient(135deg, #fdf6f8 0%, #f9edf0 100%)" }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary/50">
          {data.pageTitle || "Sobre mí"}
        </p>
        {data.pageDescription && (
          <p className="mt-1 text-[10px] text-foreground/60 line-clamp-3">
            {data.pageDescription}
          </p>
        )}
      </div>

      {/* Foto + nombre */}
      <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
          <Image
            src={photoSrc}
            alt={data.cv.name}
            fill
            className="object-cover object-center"
            sizes="64px"
            unoptimized={shouldUnoptimizeImage(photoSrc)}
          />
        </div>
        <div>
          <p className="font-bold leading-tight text-sm">
            {data.cv.name || "Nombre"}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-foreground/50">
            {data.cv.title || "Título profesional"}
          </p>
        </div>
      </div>

      {/* Sección ¿Quién soy? */}
      {data.about.headline && (
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="font-bold text-xs text-primary">{data.about.headline}</p>
          {data.about.intro && (
            <p className="mt-1 text-[10px] text-foreground/65 leading-relaxed line-clamp-4">
              {data.about.intro}
            </p>
          )}
          {data.about.highlights.filter(Boolean).length > 0 && (
            <ul className="mt-2 space-y-1">
              {data.about.highlights.filter(Boolean).slice(0, 4).map((h, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span className="text-[10px] text-foreground/70">{h}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Enfoque */}
      {data.about.approachHeadline && (
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="font-bold text-xs text-primary">{data.about.approachHeadline}</p>
          {data.about.approachIntro && (
            <p className="mt-1 text-[10px] text-foreground/65 line-clamp-3">
              {data.about.approachIntro}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Checkout/Payments preview ────────────────────────────────────────────

function CheckoutPreview({ policy }: { policy: PaymentCheckoutPolicy }) {
  const enabledMethods = policy.methods.filter((m) => m.enabled !== false);

  return (
    <div className="space-y-3">
      {/* Contacto */}
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-primary/50">
          Contacto visible en el carrito
        </p>
        <div className="space-y-1">
          {policy.contact.phone && (
            <div className="text-[10px]">
              <span className="font-semibold text-foreground/50">Tel. </span>
              {policy.contact.phone}
            </div>
          )}
          {policy.contact.instagram && (
            <div className="text-[10px]">
              <span className="font-semibold text-foreground/50">IG </span>
              @{policy.contact.instagram.replace(/^@/, "")}
            </div>
          )}
          {policy.contact.email && (
            <div className="text-[10px]">
              <span className="font-semibold text-foreground/50">Email </span>
              {policy.contact.email}
            </div>
          )}
        </div>
      </div>

      {/* Métodos */}
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-primary/50">
          Métodos de pago ({enabledMethods.length})
        </p>
        <div className="space-y-1.5">
          {enabledMethods.map((m) => (
            <div key={m.id} className="rounded-lg border border-foreground/10 bg-muted/40 p-2">
              <p className="text-[10px] font-bold">{m.label || m.id}</p>
              {m.detail && (
                <p className="mt-0.5 text-[9px] text-foreground/55 line-clamp-2">{m.detail}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Formulario del paciente */}
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-primary/50">
          Lo que completa el paciente
        </p>
        {policy.referenceLabel && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold">{policy.referenceLabel}</p>
            <div className="mt-0.5 rounded-lg border border-foreground/15 px-2 py-1 text-[9px] text-foreground/35">
              {policy.referencePlaceholder || "Ingresá el número de referencia…"}
            </div>
          </div>
        )}
        {policy.proofsLabel && (
          <div>
            <p className="text-[10px] font-semibold">{policy.proofsLabel}</p>
            {policy.proofsHint && (
              <p className="text-[9px] text-foreground/50 mt-0.5">{policy.proofsHint}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel principal de previsualización ─────────────────────────────────

type PreviewTab = "imagenes" | "web" | "conocerme" | "pagos" | "recursos";
type ImageSection = "hero" | "gallery" | "plans" | "services" | "other";

export function PageSectionPreview({
  tab,
  imageSection,
  images,
  textBlocks,
  nutricionista,
  paymentPolicy,
}: {
  tab: PreviewTab;
  imageSection?: ImageSection;
  images: LandingImagesData;
  textBlocks: SiteContentDTO[];
  nutricionista: NutricionistaPageData;
  paymentPolicy: PaymentCheckoutPolicy;
}) {
  const pageLabels: Record<PreviewTab, string> = {
    imagenes: "anttova.com",
    web: "anttova.com",
    conocerme: "anttova.com/nutricionista",
    pagos: "carrito del paciente",
    recursos: "anttova.com/resources",
  };

  const sectionContent = (() => {
    switch (tab) {
      case "imagenes":
        switch (imageSection) {
          case "gallery":
            return <GalleryPreview images={images} />;
          case "plans":
            return <PlansPreview images={images} />;
          case "services":
            return <ServicesPreview images={images} />;
          case "other":
            return <OtherImagesPreview images={images} />;
          default:
            return <HeroPreview images={images} />;
        }
      case "web":
        return <TextsPreview blocks={textBlocks} />;
      case "conocerme":
        return <ProfilePreview data={nutricionista} />;
      case "pagos":
        return <CheckoutPreview policy={paymentPolicy} />;
      case "recursos":
        return (
          <div className="rounded-xl border border-foreground/10 bg-white p-4 text-center">
            <p className="text-xs font-semibold">Biblioteca digital</p>
            <p className="mt-1 text-[10px] text-foreground/50">
              Los recursos se gestionan desde el módulo de Recursos.
            </p>
          </div>
        );
    }
  })();

  return (
    <div className="sticky top-4 flex flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-white shadow-md">
      {/* Chrome del "mini browser" */}
      <div className="flex shrink-0 items-center gap-2 border-b border-foreground/8 bg-muted/60 px-3 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="ml-2 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white/70 px-2 py-1 text-[10px] text-foreground/50 ring-1 ring-foreground/10">
          <svg width="9" height="9" viewBox="0 0 9 9" className="shrink-0 text-foreground/35">
            <circle cx="4.5" cy="4.5" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M4.5 1.5v3l2 1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
          </svg>
          <span className="truncate">{pageLabels[tab]}</span>
        </div>
        <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">
          LIVE
        </span>
      </div>

      {/* Contenido desplazable */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)", minHeight: 400 }}>
        <div className="p-3">{sectionContent}</div>
      </div>

      <div className="shrink-0 border-t border-foreground/8 bg-muted/30 px-3 py-2 text-center text-[9px] text-foreground/35">
        Vista previa en vivo · los cambios se reflejan al editar
      </div>
    </div>
  );
}
