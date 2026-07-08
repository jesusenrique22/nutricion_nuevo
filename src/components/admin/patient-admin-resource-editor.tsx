"use client";

import { useState, useTransition } from "react";
import { updatePatientAdminResource } from "@/server/actions/patient-admin-resource.actions";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";
const textareaClass = `${inputClass} min-h-[72px] resize-y`;

export function PatientAdminResourceEditor({
  patientId,
  initialUrl,
  initialNote,
}: {
  patientId: string;
  initialUrl: string | null;
  initialNote: string | null;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [note, setNote] = useState(initialNote ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    url !== (initialUrl ?? "") || note !== (initialNote ?? "");

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await updatePatientAdminResource(patientId, { url, note });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setMessage("Material guardado.");
      setTimeout(() => setMessage(null), 3000);
    });
  }

  function clear() {
    setUrl("");
    setNote("");
    startTransition(async () => {
      const res = await updatePatientAdminResource(patientId, {
        url: "",
        note: "",
      });
      setMessage(res.ok ? "Material eliminado." : res.message);
    });
  }

  return (
    <section className="mt-8 w-full rounded-2xl border border-foreground/10 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Material para el paciente</h2>
          <p className="mt-1 text-sm text-foreground/50">
            Enlace a Drive u otro recurso. El paciente lo verá en su panel de
            inicio.
          </p>
        </div>
        {url.trim() && (
          <a
            href={url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            Vista previa ↗
          </a>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="font-semibold">Enlace</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-foreground/80">
            Descripción{" "}
            <span className="font-normal text-foreground/45">(opcional)</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Plan semanal marzo, recetas y guía de compras"
            className={textareaClass}
            maxLength={500}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending || !dirty}
          onClick={save}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar material"}
        </button>
        {(initialUrl || url.trim()) && (
          <button
            type="button"
            disabled={isPending}
            onClick={clear}
            className="rounded-full border border-foreground/15 px-5 py-2 text-sm font-semibold text-foreground/70 hover:bg-muted/50 disabled:opacity-50"
          >
            Quitar
          </button>
        )}
        {message && (
          <span
            className={`text-sm font-medium ${
              message.includes("guardado") || message.includes("eliminado")
                ? "text-green-700"
                : "text-red-600"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </section>
  );
}
