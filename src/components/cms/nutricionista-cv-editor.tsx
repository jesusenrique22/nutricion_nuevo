"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/cms/image-upload-field";
import { updateNutricionistaPage } from "@/server/actions/cms.actions";
import type {
  NutricionistaCvEducation,
  NutricionistaCvExperience,
  NutricionistaPageData,
} from "@/types/nutricionista-cv";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

const textareaClass = `${inputClass} min-h-[88px] resize-y`;

const sections = [
  { id: "pagina", label: "Página" },
  { id: "perfil", label: "Perfil" },
  { id: "contacto", label: "Contacto" },
  { id: "habilidades", label: "Habilidades" },
  { id: "formacion", label: "Formación" },
  { id: "experiencia", label: "Experiencia" },
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
}: {
  initial: NutricionistaPageData;
}) {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("pagina");
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateCv<K extends keyof NutricionistaPageData["cv"]>(
    key: K,
    value: NutricionistaPageData["cv"][K],
  ) {
    setData((prev) => ({ ...prev, cv: { ...prev.cv, [key]: value } }));
  }

  function updateContact(
    key: keyof NutricionistaPageData["cv"]["contact"],
    value: string,
  ) {
    setData((prev) => ({
      ...prev,
      cv: {
        ...prev.cv,
        contact: { ...prev.cv.contact, [key]: value },
      },
    }));
  }

  function save() {
    setMessage(null);
    const payload: NutricionistaPageData = {
      ...data,
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
      setMessage(res.ok ? "CV guardado correctamente." : res.message);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground/60">
          Editá la página &quot;Conóceme más&quot; y el CV que ven tus
          pacientes en{" "}
          <Link href="/nutricionista" className="font-semibold text-primary">
            /nutricionista
          </Link>
          .
        </p>
        <Link
          href="/nutricionista"
          target="_blank"
          className="rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-muted"
        >
          Vista previa ↗
        </Link>
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
        {section === "pagina" && (
          <SectionCard title="Encabezado de la página">
            <Field label="Título">
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
                  setData((p) => ({ ...p, pageDescription: e.target.value }))
                }
                className={textareaClass}
              />
            </Field>
          </SectionCard>
        )}

        {section === "perfil" && (
          <SectionCard title="Datos principales del CV">
            <ImageUploadField
              label="Foto de perfil"
              hint="Aparece en el CV circular. Recomendado: retrato cuadrado, buena luz."
              value={data.cv.photoUrl ?? ""}
              onChange={(photoUrl) => updateCv("photoUrl", photoUrl)}
              folder="cv"
            />
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
            <Field label="Bio / presentación">
              <textarea
                value={data.cv.bio}
                onChange={(e) => updateCv("bio", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Est. (año marca)">
                <input
                  value={data.cv.est}
                  onChange={(e) => updateCv("est", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Ciudad / pie de página">
                <input
                  value={data.cv.city}
                  onChange={(e) => updateCv("city", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {section === "contacto" && (
          <SectionCard title="Contacto">
            <Field label="Teléfono">
              <input
                value={data.cv.contact.phone}
                onChange={(e) => updateContact("phone", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={data.cv.contact.email}
                onChange={(e) => updateContact("email", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Ubicación">
              <input
                value={data.cv.contact.location}
                onChange={(e) => updateContact("location", e.target.value)}
                className={inputClass}
              />
            </Field>
          </SectionCard>
        )}

        {section === "habilidades" && (
          <SectionCard title="Habilidades">
            {data.cv.skills.map((skill, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={skill}
                  onChange={(e) => {
                    const next = [...data.cv.skills];
                    next[i] = e.target.value;
                    updateCv("skills", next);
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    updateCv(
                      "skills",
                      data.cv.skills.filter((_, idx) => idx !== i),
                    )
                  }
                  className="shrink-0 rounded-xl px-3 text-sm text-red-600 hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateCv("skills", [...data.cv.skills, ""])}
              className="rounded-full border border-dashed border-foreground/20 px-4 py-2 text-xs font-semibold text-foreground/60 hover:border-primary hover:text-primary"
            >
              + Agregar habilidad
            </button>
          </SectionCard>
        )}

        {section === "formacion" && (
          <SectionCard title="Formación académica">
            {data.cv.education.map((item, i) => (
              <EducationRow
                key={i}
                item={item}
                onChange={(next) => {
                  const list = [...data.cv.education];
                  list[i] = next;
                  updateCv("education", list);
                }}
                onRemove={() =>
                  updateCv(
                    "education",
                    data.cv.education.filter((_, idx) => idx !== i),
                  )
                }
              />
            ))}
            <button
              type="button"
              onClick={() =>
                updateCv("education", [
                  ...data.cv.education,
                  { year: "", title: "", place: "" },
                ])
              }
              className="rounded-full border border-dashed border-foreground/20 px-4 py-2 text-xs font-semibold text-foreground/60 hover:border-primary hover:text-primary"
            >
              + Agregar formación
            </button>
          </SectionCard>
        )}

        {section === "experiencia" && (
          <SectionCard title="Experiencia laboral">
            {data.cv.experience.map((item, i) => (
              <ExperienceRow
                key={i}
                item={item}
                onChange={(next) => {
                  const list = [...data.cv.experience];
                  list[i] = next;
                  updateCv("experience", list);
                }}
                onRemove={() =>
                  updateCv(
                    "experience",
                    data.cv.experience.filter((_, idx) => idx !== i),
                  )
                }
              />
            ))}
            <button
              type="button"
              onClick={() =>
                updateCv("experience", [
                  ...data.cv.experience,
                  { year: "", role: "", company: "", bullets: [] },
                ])
              }
              className="rounded-full border border-dashed border-foreground/20 px-4 py-2 text-xs font-semibold text-foreground/60 hover:border-primary hover:text-primary"
            >
              + Agregar experiencia
            </button>
          </SectionCard>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar CV"}
        </button>
        {message && (
          <p
            className={`text-sm ${message.includes("correctamente") ? "text-green-700" : "text-red-600"}`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

function EducationRow({
  item,
  onChange,
  onRemove,
}: {
  item: NutricionistaCvEducation;
  onChange: (item: NutricionistaCvEducation) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-foreground/8 bg-muted/20 p-3">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-semibold text-red-600 hover:underline"
        >
          Eliminar
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Año">
          <input
            value={item.year}
            onChange={(e) => onChange({ ...item, year: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Título">
          <input
            value={item.title}
            onChange={(e) => onChange({ ...item, title: e.target.value })}
            className={`${inputClass} sm:col-span-2`}
          />
        </Field>
      </div>
      <Field label="Institución">
        <input
          value={item.place}
          onChange={(e) => onChange({ ...item, place: e.target.value })}
          className={inputClass}
        />
      </Field>
    </div>
  );
}

function ExperienceRow({
  item,
  onChange,
  onRemove,
}: {
  item: NutricionistaCvExperience;
  onChange: (item: NutricionistaCvExperience) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-foreground/8 bg-muted/20 p-3">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-semibold text-red-600 hover:underline"
        >
          Eliminar
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Período">
          <input
            value={item.year}
            onChange={(e) => onChange({ ...item, year: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Rol">
          <input
            value={item.role}
            onChange={(e) => onChange({ ...item, role: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Empresa / lugar">
        <input
          value={item.company}
          onChange={(e) => onChange({ ...item, company: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Detalle (una línea por ítem)">
        <textarea
          value={item.bullets.join("\n")}
          onChange={(e) =>
            onChange({
              ...item,
              bullets: e.target.value
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean),
            })
          }
          placeholder="Cada línea será un punto de la lista"
          className={textareaClass}
        />
      </Field>
    </div>
  );
}
