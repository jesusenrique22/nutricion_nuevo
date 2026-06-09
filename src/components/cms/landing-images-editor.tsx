"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/cms/image-upload-field";
import { landingImagesToRecord } from "@/lib/landing-images-parse";
import { updateSiteContent } from "@/server/actions/cms.actions";
import type { LandingImagesData } from "@/types/landing-images";
import { LANDING_IMAGES_SLUG } from "@/types/landing-images";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

const sections = [
  { id: "hero", label: "Hero (carrusel)" },
  { id: "gallery", label: "Galería" },
  { id: "plans", label: "Paquetes" },
  { id: "services", label: "Servicios" },
  { id: "other", label: "Otras secciones" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export function LandingImagesEditor({
  initial,
}: {
  initial: LandingImagesData;
}) {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("hero");
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await updateSiteContent({
        slug: LANDING_IMAGES_SLUG,
        title: "Imágenes landing",
        data: landingImagesToRecord(data),
      });
      setMessage(res.ok ? "Imágenes guardadas." : res.message);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div>
      <p className="text-sm text-foreground/60">
        Sube fotos del brandbook o reemplaza las imágenes de la página
        principal. Los cambios se ven en la landing al guardar.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              section === s.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4 rounded-2xl border border-foreground/10 bg-white p-4">
        {section === "hero" && (
          <div className="space-y-6">
            {data.heroSlides.map((slide, i) => (
              <div
                key={i}
                className="space-y-3 rounded-xl border border-foreground/10 p-4"
              >
                <p className="text-sm font-bold">Slide {i + 1}</p>
                <ImageUploadField
                  label="Imagen de fondo"
                  value={slide.src}
                  onChange={(src) => {
                    const next = [...data.heroSlides];
                    next[i] = { ...slide, src };
                    setData({ ...data, heroSlides: next });
                  }}
                />
                <label className="block text-sm">
                  <span className="font-semibold">Texto alt (accesibilidad)</span>
                  <input
                    value={slide.alt}
                    onChange={(e) => {
                      const next = [...data.heroSlides];
                      next[i] = { ...slide, alt: e.target.value };
                      setData({ ...data, heroSlides: next });
                    }}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Título principal</span>
                  <input
                    value={slide.line1}
                    onChange={(e) => {
                      const next = [...data.heroSlides];
                      next[i] = { ...slide, line1: e.target.value };
                      setData({ ...data, heroSlides: next });
                    }}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Subtítulo</span>
                  <input
                    value={slide.line2}
                    onChange={(e) => {
                      const next = [...data.heroSlides];
                      next[i] = { ...slide, line2: e.target.value };
                      setData({ ...data, heroSlides: next });
                    }}
                    className={inputClass}
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        {section === "gallery" && (
          <div className="space-y-4">
            {data.gallery.map((item, i) => (
              <div
                key={i}
                className="space-y-3 rounded-xl border border-foreground/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Foto {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const next = data.gallery.filter((_, idx) => idx !== i);
                      setData({ ...data, gallery: next });
                    }}
                    className="text-xs font-semibold text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
                <ImageUploadField
                  label="Imagen"
                  value={item.src}
                  onChange={(src) => {
                    const next = [...data.gallery];
                    next[i] = { ...item, src };
                    setData({ ...data, gallery: next });
                  }}
                />
                <label className="block text-sm">
                  <span className="font-semibold">Descripción</span>
                  <input
                    value={item.alt}
                    onChange={(e) => {
                      const next = [...data.gallery];
                      next[i] = { ...item, alt: e.target.value };
                      setData({ ...data, gallery: next });
                    }}
                    className={inputClass}
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setData({
                  ...data,
                  gallery: [
                    ...data.gallery,
                    { src: "", alt: "Nueva imagen Anttova" },
                  ],
                })
              }
              className="rounded-full border border-dashed border-foreground/25 px-4 py-2 text-sm font-semibold"
            >
              + Agregar foto a la galería
            </button>
          </div>
        )}

        {section === "plans" && (
          <div className="space-y-4">
            {(
              [
                ["nutrition", "Nutricional"],
                ["training", "Entrenamiento"],
                ["anthropometry", "Antropometría"],
              ] as const
            ).map(([key, label]) => (
              <ImageUploadField
                key={key}
                label={`Paquete ${label}`}
                value={data.plans[key]}
                onChange={(src) =>
                  setData({
                    ...data,
                    plans: { ...data.plans, [key]: src },
                  })
                }
              />
            ))}
          </div>
        )}

        {section === "services" && (
          <div className="space-y-4">
            {(
              [
                ["anthropometry", "Antropometría ISAK"],
                ["nutrition", "Consulta nutricional"],
                ["training", "Plan de entrenamiento"],
              ] as const
            ).map(([key, label]) => (
              <ImageUploadField
                key={key}
                label={label}
                value={data.services[key]}
                onChange={(src) =>
                  setData({
                    ...data,
                    services: { ...data.services, [key]: src },
                  })
                }
              />
            ))}
          </div>
        )}

        {section === "other" && (
          <div className="space-y-4">
            <ImageUploadField
              label="Filosofía — receta para el éxito"
              value={data.philosophyImage}
              onChange={(philosophyImage) =>
                setData({ ...data, philosophyImage })
              }
            />
            <ImageUploadField
              label="Sección «La marca»"
              hint="Imagen de productos / identidad visual"
              value={data.brandSectionImage}
              onChange={(brandSectionImage) =>
                setData({ ...data, brandSectionImage })
              }
            />
            <ImageUploadField
              label="Fondo del llamado a la acción final"
              value={data.ctaBackground}
              onChange={(ctaBackground) =>
                setData({ ...data, ctaBackground })
              }
            />
          </div>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar imágenes"}
        </button>
        {message && <p className="text-sm">{message}</p>}
      </div>
    </div>
  );
}
