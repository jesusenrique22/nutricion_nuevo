"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/cms/image-upload-field";
import { LANDING_IMAGE_SECTION_LABELS } from "@/lib/cms-labels";
import { landingImagesToRecord } from "@/lib/landing-images-parse";
import { updateSiteContent } from "@/server/actions/cms.actions";
import type { LandingImagesData } from "@/types/landing-images";
import { LANDING_IMAGES_SLUG, MAX_HERO_SLIDES } from "@/types/landing-images";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

type SectionId = "hero" | "gallery" | "plans" | "services" | "other";

const sections: { id: SectionId; label: string; hint: string }[] = [
  { id: "hero", label: LANDING_IMAGE_SECTION_LABELS.hero, hint: "Imágenes grandes que rotan en la portada." },
  { id: "gallery", label: LANDING_IMAGE_SECTION_LABELS.gallery, hint: "Franja de fotos que aparece en la landing." },
  { id: "plans", label: LANDING_IMAGE_SECTION_LABELS.plans, hint: "Una imagen por tipo de consulta." },
  { id: "services", label: LANDING_IMAGE_SECTION_LABELS.services, hint: "Imágenes de cada servicio." },
  { id: "other", label: LANDING_IMAGE_SECTION_LABELS.other, hint: "Imagen de filosofía, marca y CTA final." },
];

function UnsavedBanner({
  dirty, isPending, onSave, message,
}: {
  dirty: boolean; isPending: boolean; onSave: () => void; message: string | null;
}) {
  if (!dirty && !message) return null;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm transition ${
      message
        ? message.includes("guardadas") ? "border border-green-200 bg-green-50 text-green-800" : "border border-red-200 bg-red-50 text-red-800"
        : "border border-amber-200 bg-amber-50 text-amber-800"
    }`}>
      <span className="font-semibold">{message ?? "Tenés cambios sin guardar."}</span>
      {dirty && (
        <button type="button" disabled={isPending} onClick={onSave}
          className="rounded-full bg-amber-700 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {isPending ? "Guardando…" : "Guardar ahora"}
        </button>
      )}
    </div>
  );
}

export function LandingImagesEditor({
  initial,
  onLiveChange,
}: {
  initial: LandingImagesData;
  onLiveChange?: (data: LandingImagesData, section: SectionId) => void;
}) {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("hero");
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const savedRef = useRef(initial);

  useEffect(() => {
    if (message?.includes("guardadas")) {
      savedRef.current = data;
      setDirty(false);
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message, data]);

  function update(next: LandingImagesData) {
    setData(next);
    setDirty(true);
    setMessage(null);
    onLiveChange?.(next, section);
  }

  function changeSection(s: SectionId) {
    setSection(s);
    onLiveChange?.(data, s);
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await updateSiteContent({
        slug: LANDING_IMAGES_SLUG,
        title: "Imágenes del sitio",
        data: landingImagesToRecord(data),
      });
      setMessage(res.ok ? "Imágenes guardadas." : res.message);
      if (res.ok) router.refresh();
    });
  }

  const activeSection = sections.find((s) => s.id === section)!;

  return (
    <div className="space-y-4">
      <UnsavedBanner dirty={dirty} isPending={isPending} onSave={save} message={message} />

      {/* Selector de sección */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <button key={s.id} type="button" onClick={() => changeSection(s.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              section === s.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-foreground/50">
        <span className="font-semibold">{activeSection.label}:</span> {activeSection.hint}
      </p>

      <div className="space-y-4 rounded-2xl border border-foreground/10 bg-white p-4">
        {/* ── Hero ── */}
        {section === "hero" && (
          <div className="space-y-6">
            <p className="text-xs text-foreground/55">
              Máximo {MAX_HERO_SLIDES} diapositivas ({data.heroSlides.length}/{MAX_HERO_SLIDES}).
            </p>
            {data.heroSlides.map((slide, i) => (
              <div key={i}
                onClick={() => setActiveSlide(i)}
                className={`cursor-pointer space-y-3 rounded-xl border p-4 transition ${
                  activeSlide === i ? "border-primary/40 bg-primary/5" : "border-foreground/10 hover:border-foreground/20"
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {slide.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slide.src} alt={slide.alt} className="h-14 w-20 rounded-lg object-cover ring-1 ring-foreground/10" />
                    ) : (
                      <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-muted text-xs text-foreground/40">Sin imagen</div>
                    )}
                    <div>
                      <p className="text-sm font-bold">Diapositiva {i + 1}</p>
                      {slide.line1 && (
                        <p className="text-xs text-foreground/50">{slide.line1.slice(0, 30)}{slide.line1.length > 30 ? "…" : ""}</p>
                      )}
                    </div>
                  </div>
                  {data.heroSlides.length > 1 && (
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); update({ ...data, heroSlides: data.heroSlides.filter((_, idx) => idx !== i) }); setActiveSlide(0); }}
                      className="shrink-0 text-xs font-semibold text-red-600 hover:underline">
                      Eliminar
                    </button>
                  )}
                </div>
                {activeSlide === i && (
                  <div className="space-y-3 pt-1">
                    <ImageUploadField label="Imagen de fondo" value={slide.src}
                      onChange={(src) => { const next = [...data.heroSlides]; next[i] = { ...slide, src }; update({ ...data, heroSlides: next }); }} />
                    <label className="block text-sm">
                      <span className="font-semibold">Título principal</span>
                      <input value={slide.line1} placeholder="Ej: Tu bienestar, nuestra misión"
                        onChange={(e) => { const next = [...data.heroSlides]; next[i] = { ...slide, line1: e.target.value }; update({ ...data, heroSlides: next }); }}
                        className={inputClass} />
                    </label>
                    <label className="block text-sm">
                      <span className="font-semibold">Subtítulo</span>
                      <input value={slide.line2} placeholder="Ej: Nutrición · Entrenamiento · Bienestar"
                        onChange={(e) => { const next = [...data.heroSlides]; next[i] = { ...slide, line2: e.target.value }; update({ ...data, heroSlides: next }); }}
                        className={inputClass} />
                    </label>
                    <label className="block text-sm">
                      <span className="font-semibold text-foreground/60">Texto alt (accesibilidad)</span>
                      <input value={slide.alt}
                        onChange={(e) => { const next = [...data.heroSlides]; next[i] = { ...slide, alt: e.target.value }; update({ ...data, heroSlides: next }); }}
                        className={inputClass} />
                    </label>
                  </div>
                )}
              </div>
            ))}
            {data.heroSlides.length < MAX_HERO_SLIDES && (
              <button type="button"
                onClick={() => update({ ...data, heroSlides: [...data.heroSlides, { src: "", alt: "Nueva diapositiva", line1: "Título principal", line2: "Subtítulo" }] })}
                className="rounded-full border border-dashed border-foreground/25 px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                + Agregar diapositiva
              </button>
            )}
          </div>
        )}

        {/* ── Gallery ── */}
        {section === "gallery" && (
          <div className="space-y-4">
            {data.gallery.map((item, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-foreground/10 p-3">
                {item.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.src} alt={item.alt} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-foreground/40">Foto {i + 1}</div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Foto {i + 1}</span>
                    <button type="button" onClick={() => update({ ...data, gallery: data.gallery.filter((_, idx) => idx !== i) })}
                      className="text-xs font-semibold text-red-600 hover:underline">Eliminar</button>
                  </div>
                  <ImageUploadField label="" value={item.src}
                    onChange={(src) => { const next = [...data.gallery]; next[i] = { ...item, src }; update({ ...data, gallery: next }); }} />
                  <input value={item.alt} placeholder="Descripción de la foto"
                    onChange={(e) => { const next = [...data.gallery]; next[i] = { ...item, alt: e.target.value }; update({ ...data, gallery: next }); }}
                    className={inputClass} />
                </div>
              </div>
            ))}
            <button type="button"
              onClick={() => update({ ...data, gallery: [...data.gallery, { src: "", alt: "Nueva imagen Anttova" }] })}
              className="rounded-full border border-dashed border-foreground/25 px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
              + Agregar foto
            </button>
          </div>
        )}

        {/* ── Plans ── */}
        {section === "plans" && (
          <div className="space-y-4">
            {([["nutrition", "Consulta nutricional"], ["training", "Entrenamiento"], ["anthropometry", "Antropometría ISAK"]] as const).map(([key, label]) => (
              <div key={key} className="flex gap-4 rounded-xl border border-foreground/10 p-3">
                {data.plans[key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.plans[key]} alt={label} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted text-[10px] text-foreground/40 text-center p-1">Sin imagen</div>
                )}
                <div className="flex-1">
                  <ImageUploadField label={`Paquete ${label}`} value={data.plans[key]}
                    onChange={(src) => update({ ...data, plans: { ...data.plans, [key]: src } })} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Services ── */}
        {section === "services" && (
          <div className="space-y-4">
            {([["anthropometry", "Antropometría ISAK"], ["nutrition", "Consulta nutricional"], ["training", "Plan de entrenamiento"]] as const).map(([key, label]) => (
              <div key={key} className="flex gap-4 rounded-xl border border-foreground/10 p-3">
                {data.services[key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.services[key]} alt={label} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted text-[10px] text-foreground/40 text-center p-1">Sin imagen</div>
                )}
                <div className="flex-1">
                  <ImageUploadField label={label} value={data.services[key]}
                    onChange={(src) => update({ ...data, services: { ...data.services, [key]: src } })} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Other ── */}
        {section === "other" && (
          <div className="space-y-5">
            {[
              { key: "philosophyImage" as const, label: "Filosofía — receta para el éxito", hint: "Imagen decorativa de la sección filosófica." },
              { key: "brandSectionImage" as const, label: "Sección «La marca»", hint: "Imagen de productos o identidad visual Anttova." },
              { key: "ctaBackground" as const, label: "Fondo del llamado a la acción final", hint: "Imagen de fondo del botón grande al final." },
            ].map(({ key, label, hint }) => (
              <div key={key} className="flex gap-4 rounded-xl border border-foreground/10 p-3">
                {data[key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data[key]} alt={label} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted text-[10px] text-foreground/40 text-center p-1">Sin imagen</div>
                )}
                <div className="flex-1">
                  <ImageUploadField label={label} hint={hint} value={data[key]}
                    onChange={(src) => update({ ...data, [key]: src })} />
                </div>
              </div>
            ))}
          </div>
        )}

        <button type="button" disabled={isPending || !dirty} onClick={save}
          className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          {isPending ? "Guardando…" : "Guardar imágenes"}
        </button>
      </div>
    </div>
  );
}
