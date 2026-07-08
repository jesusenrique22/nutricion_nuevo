"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { siteBlockLabel, siteFieldHint, siteFieldLabel } from "@/lib/cms-labels";
import { updateSiteContent } from "@/server/actions/cms.actions";
import type { SiteContentDTO } from "@/server/actions/cms.actions";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-foreground/15 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

function fieldsFromData(data: Record<string, unknown>) {
  return Object.entries(data).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

export function SiteContentEditor({
  blocks,
  onLiveChange,
}: {
  blocks: SiteContentDTO[];
  onLiveChange?: (blocks: SiteContentDTO[]) => void;
}) {
  const router = useRouter();
  const [active, setActive] = useState(blocks[0]?.slug ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  // Local copy of all blocks so we can update the active one and pass up
  const [localBlocks, setLocalBlocks] = useState(blocks);

  const block = localBlocks.find((b) => b.slug === active) ?? localBlocks[0];
  if (!block) return null;

  const [fields, setFields] = useState(fieldsFromData(block.data));

  function selectBlock(slug: string) {
    const next = localBlocks.find((b) => b.slug === slug);
    if (!next) return;
    setActive(slug);
    setFields(fieldsFromData(next.data));
    setMessage(null);
    setDirty(false);
  }

  function updateField(i: number, value: string) {
    const next = [...fields];
    next[i] = { ...fields[i], value };
    setFields(next);
    setDirty(true);
    setMessage(null);

    // Actualiza el bloque activo en localBlocks y notifica al preview
    const updatedData: Record<string, unknown> = {};
    for (const f of next) updatedData[f.key] = f.value;
    const updatedBlocks = localBlocks.map((b) =>
      b.slug === active ? { ...b, data: updatedData } : b,
    );
    setLocalBlocks(updatedBlocks);
    onLiveChange?.(updatedBlocks);
  }

  useEffect(() => {
    if (message?.includes("guardado")) {
      const t = setTimeout(() => { setMessage(null); setDirty(false); }, 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-white">
      {/* Selector de bloque */}
      <div className="flex flex-wrap gap-2 border-b border-foreground/8 p-4">
        {localBlocks.map((b) => (
          <button key={b.slug} type="button" onClick={() => selectBlock(b.slug)}
            className={`max-w-full rounded-full px-3 py-1.5 text-xs font-semibold leading-snug transition sm:px-4 sm:py-2 sm:text-sm ${
              active === b.slug ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}>
            {siteBlockLabel(b.slug, b.title)}
          </button>
        ))}
      </div>

      <form className="space-y-5 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          const data: Record<string, unknown> = {};
          for (const f of fields) data[f.key] = f.value;
          startTransition(async () => {
            const res = await updateSiteContent({ slug: block.slug, title: siteBlockLabel(block.slug, block.title), data });
            setMessage(res.ok ? "Contenido guardado." : res.message);
            if (res.ok) router.refresh();
          });
        }}>

        {(dirty || message) && (
          <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
            message
              ? message.includes("guardado") ? "border border-green-200 bg-green-50 text-green-800" : "border border-red-200 bg-red-50 text-red-700"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}>
            <span className="font-semibold">{message ?? "Tenés cambios sin guardar."}</span>
            {dirty && !message && (
              <button type="submit" disabled={isPending}
                className="rounded-full bg-amber-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">
                {isPending ? "Guardando…" : "Guardar ahora"}
              </button>
            )}
          </div>
        )}

        <p className="text-sm text-foreground/60">
          Editá los textos de <strong>{siteBlockLabel(block.slug, block.title)}</strong>. Los cambios se ven en la página pública al guardar.
        </p>

        {fields.map((f, i) => {
          const label = siteFieldLabel(block.slug, f.key);
          const hint = siteFieldHint(block.slug, f.key);
          const isLong = f.key === "bio" || f.key === "subheadline" || f.value.length > 80;

          return (
            <label key={f.key} className="block text-sm">
              <span className="font-semibold">{label}</span>
              {hint && <span className="mt-0.5 block text-xs text-foreground/50">{hint}</span>}
              {isLong ? (
                <textarea value={f.value} rows={3} onChange={(e) => updateField(i, e.target.value)}
                  className={`${inputClass} min-h-[88px] resize-y`} />
              ) : (
                <input value={f.value} onChange={(e) => updateField(i, e.target.value)} className={inputClass} />
              )}
            </label>
          );
        })}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" disabled={isPending || !dirty}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            {isPending ? "Guardando…" : "Guardar sección"}
          </button>
          {!dirty && !message && <span className="text-xs text-foreground/40">Sin cambios</span>}
        </div>
      </form>
    </div>
  );
}
