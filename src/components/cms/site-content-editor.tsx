"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  siteBlockLabel,
  siteFieldHint,
  siteFieldLabel,
} from "@/lib/cms-labels";
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

export function SiteContentEditor({ blocks }: { blocks: SiteContentDTO[] }) {
  const router = useRouter();
  const [active, setActive] = useState(blocks[0]?.slug ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const block = blocks.find((b) => b.slug === active) ?? blocks[0];
  if (!block) return null;

  const [fields, setFields] = useState(fieldsFromData(block.data));

  function selectBlock(slug: string) {
    const next = blocks.find((b) => b.slug === slug);
    if (!next) return;
    setActive(slug);
    setFields(fieldsFromData(next.data));
    setMessage(null);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-white">
      <div className="flex gap-2 overflow-x-auto border-b border-foreground/8 p-4">
        {blocks.map((b) => (
          <button
            key={b.slug}
            type="button"
            onClick={() => selectBlock(b.slug)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === b.slug
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {siteBlockLabel(b.slug, b.title)}
          </button>
        ))}
      </div>

      <form
        className="space-y-5 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          const data: Record<string, unknown> = {};
          for (const f of fields) {
            data[f.key] = f.value;
          }
          startTransition(async () => {
            const res = await updateSiteContent({
              slug: block.slug,
              title: siteBlockLabel(block.slug, block.title),
              data,
            });
            setMessage(res.ok ? "Contenido guardado." : res.message);
            if (res.ok) router.refresh();
          });
        }}
      >
        <p className="text-sm text-foreground/60">
          Editá los textos de{" "}
          <strong>{siteBlockLabel(block.slug, block.title)}</strong>. Los cambios
          se ven en la página pública al guardar.
        </p>

        {fields.map((f, i) => {
          const label = siteFieldLabel(block.slug, f.key);
          const hint = siteFieldHint(block.slug, f.key);
          const isLong =
            f.key === "bio" ||
            f.key === "subheadline" ||
            f.value.length > 80;

          return (
            <label key={f.key} className="block text-sm">
              <span className="font-semibold">{label}</span>
              {hint && (
                <span className="mt-0.5 block text-xs text-foreground/50">
                  {hint}
                </span>
              )}
              {isLong ? (
                <textarea
                  value={f.value}
                  rows={3}
                  onChange={(e) => {
                    const next = [...fields];
                    next[i] = { ...f, value: e.target.value };
                    setFields(next);
                  }}
                  className={`${inputClass} min-h-[88px] resize-y`}
                />
              ) : (
                <input
                  value={f.value}
                  onChange={(e) => {
                    const next = [...fields];
                    next[i] = { ...f, value: e.target.value };
                    setFields(next);
                  }}
                  className={inputClass}
                />
              )}
            </label>
          );
        })}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "Guardando…" : "Guardar sección"}
          </button>
          {message && <p className="text-sm text-foreground/70">{message}</p>}
        </div>
      </form>
    </div>
  );
}
