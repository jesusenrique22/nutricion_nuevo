"use client";

import Link from "next/link";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImageMedia } from "@/components/media/image-media";
import { PdfMedia } from "@/components/media/pdf-media";
import { updateNutricionistaPage } from "@/server/actions/cms.actions";
import type { NutricionistaPageData } from "@/types/nutricionista-cv";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

const textareaClass = `${inputClass} min-h-[88px] resize-y`;

const sections = [
  { id: "sobre-mi", label: "Sobre mí" },
  { id: "pagina-cv", label: "CV (PDF)" },
] as const;

type SectionId = (typeof sections)[number]["id"];

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-white p-4 sm:p-5">
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">
        {title}
      </h3>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

export function NutricionistaCvEditor({
  initial,
  onLiveChange,
}: {
  initial: NutricionistaPageData;
  onLiveChange?: (data: NutricionistaPageData) => void;
}) {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("sobre-mi");
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  function updateCv<K extends keyof NutricionistaPageData["cv"]>(
    key: K,
    value: NutricionistaPageData["cv"][K],
  ) {
    setData((prev) => {
      const next = { ...prev, cv: { ...prev.cv, [key]: value } };
      onLiveChange?.(next);
      return next;
    });
    setDirty(true);
    setMessage(null);
  }

  function updateAbout<K extends keyof NutricionistaPageData["about"]>(
    key: K,
    value: NutricionistaPageData["about"][K],
  ) {
    setData((prev) => {
      const next = { ...prev, about: { ...prev.about, [key]: value } };
      onLiveChange?.(next);
      return next;
    });
    setDirty(true);
    setMessage(null);
  }

  // Auto-clear success banner
  useEffect(() => {
    if (message?.includes("correctamente")) {
      const t = setTimeout(() => {
        setMessage(null);
        setDirty(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  function save() {
    setMessage(null);
    const payload: NutricionistaPageData = {
      ...data,
      cvPdfUrls: data.cvPdfUrls.map((url) => url.trim()).filter(Boolean),
      about: {
        ...data.about,
        highlights: data.about.highlights.map((s) => s.trim()).filter(Boolean),
        approachHighlights: data.about.approachHighlights
          .map((s) => s.trim())
          .filter(Boolean),
      },
      cv: {
        ...data.cv,
        skills: data.cv.skills.map((s) => s.trim()).filter(Boolean),
        education: data.cv.education.filter(
          (e) => e.year.trim() && e.title.trim() && e.place.trim(),
        ),
        experience: data.cv.experience.filter(
          (e) => e.year.trim() && e.role.trim() && e.company.trim(),
        ),
      },
    };
    startTransition(async () => {
      const res = await updateNutricionistaPage(payload);
      setMessage(res.ok ? "Contenido guardado correctamente." : res.message);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {(dirty || message) && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm ${
            message
              ? message.includes("correctamente")
                ? "border border-green-200 bg-green-50 text-green-800"
                : "border border-red-200 bg-red-50 text-red-700"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span className="font-semibold">
            {message ?? "Tenés cambios sin guardar."}
          </span>
          {dirty && !message && (
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="rounded-full bg-amber-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar ahora"}
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground/60">
          Editá la página &quot;Sobre mí&quot; y el CV de especialidad que ven
          tus pacientes en{" "}
          <Link href="/nutricionista" className="font-semibold text-primary">
            /nutricionista
          </Link>{" "}
          y{" "}
          <Link
            href="/nutricionista/especialidad"
            className="font-semibold text-primary"
          >
            /nutricionista/especialidad
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/nutricionista"
            target="_blank"
            className="rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-muted"
          >
            Vista Sobre mí ↗
          </Link>
          <Link
            href="/nutricionista/especialidad"
            target="_blank"
            className="rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-muted"
          >
            Vista CV ↗
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              section === s.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {section === "sobre-mi" && (
          <>
            <SectionCard title="Encabezado — Sobre mí">
              <Field label="Título de la página">
                <input
                  value={data.pageTitle}
                  onChange={(e) =>
                    setData((p) => ({ ...p, pageTitle: e.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Descripción breve">
                <textarea
                  value={data.pageDescription}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      pageDescription: e.target.value,
                    }))
                  }
                  className={textareaClass}
                />
              </Field>
            </SectionCard>

            <SectionCard title="¿Quién soy?">
              <Field label="Título de sección">
                <input
                  value={data.about.headline}
                  onChange={(e) => updateAbout("headline", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Presentación">
                <textarea
                  value={data.about.intro}
                  onChange={(e) => updateAbout("intro", e.target.value)}
                  className={textareaClass}
                />
              </Field>
              <StringListEditor
                label="Puntos destacados"
                items={data.about.highlights}
                onChange={(highlights) => updateAbout("highlights", highlights)}
              />
            </SectionCard>

            <SectionCard title="Enfoque / especialidad">
              <Field label="Título de sección">
                <input
                  value={data.about.approachHeadline}
                  onChange={(e) =>
                    updateAbout("approachHeadline", e.target.value)
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Introducción">
                <textarea
                  value={data.about.approachIntro}
                  onChange={(e) => updateAbout("approachIntro", e.target.value)}
                  className={textareaClass}
                />
              </Field>
              <StringListEditor
                label="Puntos del enfoque"
                items={data.about.approachHighlights}
                onChange={(approachHighlights) =>
                  updateAbout("approachHighlights", approachHighlights)
                }
              />
              <Field label="Cierre (negrita)">
                <textarea
                  value={data.about.approachClosing}
                  onChange={(e) =>
                    updateAbout("approachClosing", e.target.value)
                  }
                  className={textareaClass}
                />
              </Field>
              <Field label="Texto del botón al CV">
                <input
                  value={data.about.specialtyLinkLabel}
                  onChange={(e) =>
                    updateAbout("specialtyLinkLabel", e.target.value)
                  }
                  className={inputClass}
                />
              </Field>
            </SectionCard>

            <SectionCard title="Foto y nombre">
              <ImageMedia.Root
                value={data.cv.photoUrl ?? ""}
                onChange={(photoUrl) => updateCv("photoUrl", photoUrl)}
                folder="cv"
                hint="Aparece en la página Sobre mí. Recomendado: retrato vertical, buena luz."
              >
                <ImageMedia.Label>Foto de perfil</ImageMedia.Label>
                <ImageMedia.Hint />
                <ImageMedia.UrlField />
                <ImageMedia.Preview />
                <ImageMedia.Actions>
                  <ImageMedia.UploadButton />
                  <ImageMedia.ClearButton />
                </ImageMedia.Actions>
                <ImageMedia.Library />
                <ImageMedia.StatusModal />
              </ImageMedia.Root>
              <Field label="Nombre completo">
                <input
                  value={data.cv.name}
                  onChange={(e) => updateCv("name", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Título profesional">
                <input
                  value={data.cv.title}
                  onChange={(e) => updateCv("title", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </SectionCard>
          </>
        )}

        {section === "pagina-cv" && (
          <>
            <SectionCard title="Encabezado — CV / especialidad">
              <Field label="Título de la página CV">
                <input
                  value={data.about.specialtyPageTitle}
                  onChange={(e) =>
                    updateAbout("specialtyPageTitle", e.target.value)
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Descripción breve">
                <textarea
                  value={data.about.specialtyPageDescription}
                  onChange={(e) =>
                    updateAbout("specialtyPageDescription", e.target.value)
                  }
                  className={textareaClass}
                />
              </Field>
            </SectionCard>

            <SectionCard title="Archivos PDF del CV">
              <PdfMedia.ListRoot
                values={data.cvPdfUrls}
                onChange={(cvPdfUrls) => {
                  setData((prev) => {
                    const next = { ...prev, cvPdfUrls };
                    onLiveChange?.(next);
                    return next;
                  });
                  setDirty(true);
                  setMessage(null);
                }}
                folder="cv"
                hint="Podés subir uno o varios PDFs (por ejemplo, si el CV tiene varias partes). Se muestran en orden. Máx. 20 MB por archivo."
              >
                <PdfMedia.Label>CV en PDF</PdfMedia.Label>
                <PdfMedia.Hint />
                <PdfMedia.ListItems emptyMessage="Todavía no hay PDFs. Subí uno o más archivos del CV." />
                <div className="mt-3">
                  <PdfMedia.UploadButton list />
                </div>
                <PdfMedia.ErrorText />
              </PdfMedia.ListRoot>
            </SectionCard>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending || !dirty}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
        {!dirty && !message && (
          <span className="text-xs text-foreground/40">Sin cambios</span>
        )}
      </div>
    </div>
  );
}

function StringListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="block text-sm">
      <span className="font-semibold">{label}</span>
      <div className="mt-2 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded-xl px-3 text-sm text-red-600 hover:bg-red-50"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="rounded-full border border-dashed border-foreground/20 px-4 py-2 text-xs font-semibold text-foreground/60 hover:border-primary hover:text-primary"
        >
          + Agregar punto
        </button>
      </div>
    </div>
  );
}
