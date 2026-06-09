"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSiteContent } from "@/server/actions/cms.actions";
import type { SiteContentDTO } from "@/server/actions/cms.actions";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

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
    <div>
      <div className="flex flex-wrap gap-2">
        {blocks.map((b) => (
          <button
            key={b.slug}
            type="button"
            onClick={() => selectBlock(b.slug)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              active === b.slug
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            {b.title ?? b.slug}
          </button>
        ))}
      </div>

      <form
        className="mt-4 space-y-3 rounded-2xl border border-foreground/10 bg-white p-4"
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
              title: block.title ?? undefined,
              data,
            });
            setMessage(res.ok ? "Contenido guardado." : res.message);
            if (res.ok) router.refresh();
          });
        }}
      >
        {fields.map((f, i) => (
          <label key={f.key} className="block text-sm">
            <span className="font-semibold capitalize">{f.key}</span>
            <input
              value={f.value}
              onChange={(e) => {
                const next = [...fields];
                next[i] = { ...f, value: e.target.value };
                setFields(next);
              }}
              className={inputClass}
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Guardar sección
        </button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </div>
  );
}
