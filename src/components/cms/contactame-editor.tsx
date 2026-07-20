"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { contactameToRecord } from "@/lib/contactame-parse";
import { updateSiteContent } from "@/server/actions/cms.actions";
import {
  CONTACTAME_SLUG,
  type ContactameData,
  type ContactameLink,
  type ContactameLinkKind,
} from "@/types/contactame";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

const KIND_OPTIONS: {
  value: ContactameLinkKind;
  label: string;
  hrefHint: string;
  defaultHref: string;
}[] = [
  {
    value: "instagram",
    label: "Instagram",
    hrefHint: "https://instagram.com/tu_usuario",
    defaultHref: "https://instagram.com/",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    hrefHint: "https://wa.me/54911…",
    defaultHref: "https://wa.me/549",
  },
  {
    value: "tiktok",
    label: "TikTok",
    hrefHint: "https://tiktok.com/@tu_usuario",
    defaultHref: "https://tiktok.com/@",
  },
  {
    value: "youtube",
    label: "YouTube",
    hrefHint: "https://youtube.com/@tu_canal",
    defaultHref: "https://youtube.com/@",
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    hrefHint: "https://linkedin.com/…",
    defaultHref: "https://linkedin.com/",
  },
  {
    value: "email",
    label: "Email",
    hrefHint: "mailto:correo@ejemplo.com",
    defaultHref: "mailto:",
  },
  {
    value: "phone",
    label: "Teléfono",
    hrefHint: "tel:+54911…",
    defaultHref: "tel:+549",
  },
  {
    value: "location",
    label: "Ubicación / Maps",
    hrefHint: "https://maps.google.com/?q=…",
    defaultHref: "https://maps.google.com/?q=",
  },
  {
    value: "custom",
    label: "Otro / personalizado",
    hrefHint: "https://…",
    defaultHref: "https://",
  },
];

function presetFor(kind: ContactameLinkKind): ContactameLink {
  const opt = KIND_OPTIONS.find((o) => o.value === kind) ?? KIND_OPTIONS.at(-1)!;
  return {
    id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: opt.label,
    href: opt.defaultHref,
    enabled: true,
    kind,
    external: kind !== "email" && kind !== "phone",
  };
}

export function ContactameEditor({
  initial,
  onLiveChange,
}: {
  initial: ContactameData;
  onLiveChange?: (data: ContactameData) => void;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draftKind, setDraftKind] = useState<ContactameLinkKind>("instagram");
  const [draftLabel, setDraftLabel] = useState("Instagram");
  const [draftHref, setDraftHref] = useState("https://instagram.com/");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const createFormId = useId();

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    if (!highlightId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-link-id="${highlightId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const t = window.setTimeout(() => setHighlightId(null), 1800);
    return () => window.clearTimeout(t);
  }, [highlightId, data.links.length]);

  function update(next: ContactameData) {
    setData(next);
    onLiveChange?.(next);
  }

  function updateLink(index: number, patch: Partial<ContactameLink>) {
    const links = data.links.map((l, i) =>
      i === index ? { ...l, ...patch } : l,
    );
    update({ ...data, links });
  }

  function removeLink(index: number) {
    update({ ...data, links: data.links.filter((_, i) => i !== index) });
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= data.links.length) return;
    const links = [...data.links];
    [links[index], links[target]] = [links[target]!, links[index]!];
    update({ ...data, links });
  }

  function addLink(link: ContactameLink) {
    update({ ...data, links: [...data.links, link] });
    setHighlightId(link.id);
    setMessage(null);
  }

  function createFromDraft() {
    const label = draftLabel.trim();
    const href = draftHref.trim();
    if (!label || !href) {
      setMessage("Completá el texto y la URL para crear el botón.");
      return;
    }
    const link: ContactameLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label,
      href,
      enabled: true,
      kind: draftKind,
      external: draftKind !== "email" && draftKind !== "phone",
    };
    addLink(link);
    const next = KIND_OPTIONS.find((o) => o.value === draftKind) ?? KIND_OPTIONS[0]!;
    setDraftLabel(next.label);
    setDraftHref(next.defaultHref);
  }

  function onPickKind(kind: ContactameLinkKind) {
    const opt = KIND_OPTIONS.find((o) => o.value === kind)!;
    setDraftKind(kind);
    setDraftLabel(opt.label);
    setDraftHref(opt.defaultHref);
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await updateSiteContent({
        slug: CONTACTAME_SLUG,
        title: "Contáctame",
        data: contactameToRecord(data),
      });
      setMessage(res.ok ? "Contáctame actualizado." : res.message);
      if (res.ok) router.refresh();
    });
  }

  const draftHint =
    KIND_OPTIONS.find((o) => o.value === draftKind)?.hrefHint ?? "https://…";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground/75">
        Estos botones aparecen en el pie del sitio (sección{" "}
        <strong>Contáctame</strong>). Creá los que necesites, activá o
        desactivá cada uno y guardá.
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-white p-4 space-y-4">
        <label className="block text-sm">
          <span className="font-semibold">Título de la sección</span>
          <input
            className={inputClass}
            value={data.sectionTitle}
            onChange={(e) => update({ ...data, sectionTitle: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Línea bajo los botones</span>
          <input
            className={inputClass}
            value={data.footerLine}
            onChange={(e) => update({ ...data, footerLine: e.target.value })}
            placeholder="Nutrición · Fitness · …"
          />
        </label>
      </div>

      {/* Crear botón */}
      <div
        id={createFormId}
        className="rounded-2xl border-2 border-dashed border-primary/25 bg-white p-4 space-y-3"
      >
        <div>
          <h3 className="text-sm font-bold text-primary">Crear botón</h3>
          <p className="mt-0.5 text-xs text-foreground/55">
            Elegí un tipo rápido o armá uno personalizado y tocá Crear.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {KIND_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onPickKind(o.value);
                // Un toque = crear al instante con plantilla
                addLink(presetFor(o.value));
              }}
              className="rounded-full border border-foreground/15 bg-muted/40 px-3 py-1.5 text-xs font-semibold hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              + {o.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold">Tipo</span>
            <select
              className={inputClass}
              value={draftKind}
              onChange={(e) => onPickKind(e.target.value as ContactameLinkKind)}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Texto del botón</span>
            <input
              className={inputClass}
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              placeholder="Ej. Instagram"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-semibold">URL / enlace</span>
            <input
              className={inputClass}
              value={draftHref}
              onChange={(e) => setDraftHref(e.target.value)}
              placeholder={draftHint}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={createFromDraft}
          className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Crear botón
        </button>
      </div>

      <div ref={listRef} className="space-y-3">
        {data.links.length === 0 ? (
          <p className="rounded-xl border border-dashed border-foreground/15 bg-white/60 px-4 py-6 text-center text-sm text-foreground/50">
            Todavía no hay botones. Usá <strong>+ Instagram</strong>,{" "}
            <strong>+ Ubicación</strong> o el formulario de arriba.
          </p>
        ) : (
          data.links.map((link, index) => (
            <div
              key={link.id}
              data-link-id={link.id}
              className={`rounded-2xl border bg-white p-4 space-y-3 transition ${
                highlightId === link.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-foreground/10"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={link.enabled}
                    onChange={(e) =>
                      updateLink(index, { enabled: e.target.checked })
                    }
                  />
                  Visible en el sitio
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => moveLink(index, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-foreground/15 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLink(index, 1)}
                    disabled={index === data.links.length - 1}
                    className="rounded-lg border border-foreground/15 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Quitar
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-semibold">Texto del botón</span>
                  <input
                    className={inputClass}
                    value={link.label}
                    onChange={(e) =>
                      updateLink(index, { label: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Tipo</span>
                  <select
                    className={inputClass}
                    value={link.kind}
                    onChange={(e) => {
                      const kind = e.target.value as ContactameLinkKind;
                      updateLink(index, {
                        kind,
                        external: kind !== "email" && kind !== "phone",
                      });
                    }}
                  >
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-semibold">URL / enlace</span>
                  <input
                    className={inputClass}
                    value={link.href}
                    onChange={(e) =>
                      updateLink(index, { href: e.target.value })
                    }
                    placeholder={
                      KIND_OPTIONS.find((o) => o.value === link.kind)
                        ?.hrefHint ?? "https://…"
                    }
                  />
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar Contáctame"}
        </button>
        {message && <p className="text-sm text-foreground/60">{message}</p>}
      </div>
    </div>
  );
}
